import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { zcqlQuery } from "@/lib/zcql";
import { isDemoMode, DEMO_PASSWORD, DEMO_SESSION_USER } from "@/lib/demoData";

/**
 * Deliberately kept on NextAuth (Credentials provider) rather than migrating
 * to Catalyst's built-in Authentication. Catalyst Authentication is built
 * around Catalyst owning the login UI (a hosted login page or embedded
 * widget that sets its own session cookie, read by `catalyst.initialize(req)`
 * automatically) and a self-signup user model capped at 25 users in the
 * development environment — a mismatch for KSP's IT-provisioned KGID
 * employee directory and its existing custom login form. Only the Prisma
 * query below was migrated (to ZCQL); the session/credential-check model is
 * unchanged. Revisit if Catalyst's hosted/embedded login is explicitly
 * wanted later — that would replace this file and app/login/*.
 */
export const authOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "KSP Employee Login",
      credentials: {
        kgid: { label: "KGID", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.kgid || !credentials?.password) return null;

        // Local demo mode: no database. Any KGID with the demo password signs
        // in as the state-level analyst (see lib/demoData.js).
        if (isDemoMode()) {
          if (credentials.password !== DEMO_PASSWORD) return null;
          const user = { ...DEMO_SESSION_USER, kgid: credentials.kgid || DEMO_SESSION_USER.kgid };
          return { id: String(user.employeeId), employee: user };
        }

        const employeeRows = await zcqlQuery(
          `SELECT ROWID AS EmployeeID, KGID, Name, DOB, Gender, DistrictID, UnitID,
                  RankID, DesignationID, PasswordHash, VictimClearance
           FROM Employee WHERE KGID = '${escapeSql(credentials.kgid)}'`,
          "Employee"
        );
        const employee = employeeRows[0];
        if (!employee) return null;

        const valid = await bcrypt.compare(credentials.password, employee.PasswordHash);
        if (!valid) return null;

        const [ranks, designations, districts, units, unitTypes] = await Promise.all([
          zcqlQuery(`SELECT ROWID AS RankID, RankName, Hierarchy FROM Rank WHERE ROWID = ${employee.RankID}`, "Rank"),
          zcqlQuery(
            `SELECT ROWID AS DesignationID, DesignationName FROM Designation WHERE ROWID = ${employee.DesignationID}`,
            "Designation"
          ),
          employee.DistrictID != null
            ? zcqlQuery(
                `SELECT ROWID AS DistrictID, DistrictName FROM District WHERE ROWID = ${employee.DistrictID}`,
                "District"
              )
            : Promise.resolve([]),
          employee.UnitID != null
            ? zcqlQuery(`SELECT ROWID AS UnitID, UnitName, UnitTypeID FROM Unit WHERE ROWID = ${employee.UnitID}`, "Unit")
            : Promise.resolve([]),
          Promise.resolve([]), // populated below once we know the unit's UnitTypeID
        ]);

        const unit = units[0] ?? null;
        const resolvedUnitTypes =
          unit != null
            ? await zcqlQuery(
                `SELECT ROWID AS UnitTypeID, CityDistState FROM UnitType WHERE ROWID = ${unit.UnitTypeID}`,
                "UnitType"
              )
            : unitTypes;

        const rank = ranks[0];
        const designation = designations[0];
        const district = districts[0] ?? null;
        const unitType = resolvedUnitTypes[0] ?? null;
        const isStateLevel = unitType?.CityDistState === "State";

        const sessionEmployee = {
          employeeId: employee.EmployeeID,
          kgid: employee.KGID,
          name: employee.Name,
          rankName: rank?.RankName ?? "Unknown",
          rankHierarchy: rank?.Hierarchy ?? null,
          designationName: designation?.DesignationName ?? "Unknown",
          districtId: employee.DistrictID,
          districtName: district?.DistrictName ?? null,
          unitId: employee.UnitID,
          unitName: unit?.UnitName ?? null,
          isStateLevel,
          victimClearance: employee.VictimClearance,
        };

        // NextAuth's `authorize` return wants a User-shaped object; we stash
        // our full session payload as `employee` and unpack it in the jwt callback.
        return { id: String(employee.EmployeeID), employee: sessionEmployee };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.employee = user.employee;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.employee) {
        session.user = token.employee;
      }
      return session;
    },
  },
};

/** KGID is user-submitted (the login form's username field) — escape before interpolation. */
function escapeSql(value) {
  return String(value).replace(/'/g, "''");
}
