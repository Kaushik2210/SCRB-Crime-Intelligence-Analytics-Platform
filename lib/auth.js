import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

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

        const employee = await prisma.employee.findUnique({
          where: { KGID: credentials.kgid },
          include: {
            Rank: true,
            Designation: true,
            District: true,
            Unit: { include: { UnitType: true } },
          },
        });
        if (!employee) return null;

        const valid = await bcrypt.compare(credentials.password, employee.PasswordHash);
        if (!valid) return null;

        const isStateLevel = employee.Unit?.UnitType.CityDistState === "State";

        const sessionEmployee = {
          employeeId: employee.EmployeeID,
          kgid: employee.KGID,
          name: employee.Name,
          rankName: employee.Rank.RankName,
          rankHierarchy: employee.Rank.Hierarchy,
          designationName: employee.Designation.DesignationName,
          districtId: employee.DistrictID,
          districtName: employee.District?.DistrictName ?? null,
          unitId: employee.UnitID,
          unitName: employee.Unit?.UnitName ?? null,
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
