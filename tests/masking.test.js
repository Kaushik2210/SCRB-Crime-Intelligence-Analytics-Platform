import { describe, it, expect, vi, beforeEach } from "vitest";

const createManyMock = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: { accessLog: { createMany: (...args) => createManyMock(...args) } },
}));

const { maskVictim, maskVictims, logUnmaskedVictimAccess } = await import("@/lib/masking");

function makeSession(overrides) {
  return {
    employeeId: 42,
    kgid: "KGID100042",
    name: "Test Employee",
    rankName: "Inspector",
    rankHierarchy: 8,
    designationName: "Station House Officer",
    districtId: 3,
    districtName: "Mysuru",
    unitId: 10,
    unitName: "Mysuru Town Police Station",
    isStateLevel: false,
    victimClearance: false,
    ...overrides,
  };
}

beforeEach(() => {
  createManyMock.mockClear();
});

describe("maskVictim", () => {
  it("replaces the victim name with a stable label by default", () => {
    const session = makeSession({ victimClearance: false });
    const masked = maskVictim({ VictimMasterID: 7, VictimName: "Real Name" }, session);
    expect(masked.VictimName).toBe("Victim #7");
  });

  it("leaves the victim name intact when the session has explicit clearance", () => {
    const session = makeSession({ victimClearance: true });
    const masked = maskVictim({ VictimMasterID: 7, VictimName: "Real Name" }, session);
    expect(masked.VictimName).toBe("Real Name");
  });

  it("masks every victim in a list consistently", () => {
    const session = makeSession({ victimClearance: false });
    const victims = [
      { VictimMasterID: 1, VictimName: "A" },
      { VictimMasterID: 2, VictimName: "B" },
    ];
    const masked = maskVictims(victims, session);
    expect(masked.map((v) => v.VictimName)).toEqual(["Victim #1", "Victim #2"]);
  });
});

describe("logUnmaskedVictimAccess", () => {
  it("writes an audit-trail row when a cleared user views unmasked victim data", async () => {
    const session = makeSession({ victimClearance: true, employeeId: 99 });
    await logUnmaskedVictimAccess(session, [5, 6]);
    expect(createManyMock).toHaveBeenCalledTimes(1);
    const arg = createManyMock.mock.calls[0][0];
    expect(arg.data).toEqual([
      { UserID: 99, Entity: "Victim", RecordID: 5, Action: "VIEW_UNMASKED" },
      { UserID: 99, Entity: "Victim", RecordID: 6, Action: "VIEW_UNMASKED" },
    ]);
  });

  it("does not write an audit row for a masked (non-cleared) session", async () => {
    const session = makeSession({ victimClearance: false });
    await logUnmaskedVictimAccess(session, [5, 6]);
    expect(createManyMock).not.toHaveBeenCalled();
  });

  it("does not write an audit row when there are no victim ids", async () => {
    const session = makeSession({ victimClearance: true });
    await logUnmaskedVictimAccess(session, []);
    expect(createManyMock).not.toHaveBeenCalled();
  });
});
