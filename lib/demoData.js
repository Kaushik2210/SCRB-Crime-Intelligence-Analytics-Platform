/**
 * Zero-dependency LOCAL DEMO MODE.
 *
 * The app's real data layer targets Catalyst Data Store (ZCQL), which needs a
 * live Catalyst request context (server.js) and a fully-created schema. When
 * neither Postgres nor a finished Catalyst project is available locally,
 * setting DEMO_MODE=true swaps every ZCQL read for this in-memory dataset so
 * the whole app runs — login, dashboard, maps, charts, network graph — with
 * no database at all.
 *
 * The demo login is STATE-LEVEL, so every jurisdiction scope filter resolves
 * to an always-true filter and lib/* fetches the full dataset and aggregates in JS exactly as
 * it would against a real backend. That lets demoQuery ignore WHERE clauses
 * and simply return all rows for the queried table.
 */

export function isDemoMode() {
  return process.env.DEMO_MODE === "true";
}

// --- deterministic PRNG so the dataset is stable across restarts ------------
let seed = 1337;
function rand() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}
const randInt = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const pick = (arr) => arr[randInt(0, arr.length - 1)];
const jitter = (v, s) => v + (rand() - 0.5) * 2 * s;
function daysAgoISO(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

// --- static lookups ---------------------------------------------------------
const DISTRICTS = [
  { DistrictID: 1, DistrictName: "Bengaluru Urban", CentroidLat: 12.9716, CentroidLng: 77.5946 },
  { DistrictID: 2, DistrictName: "Mysuru", CentroidLat: 12.2958, CentroidLng: 76.6394 },
  { DistrictID: 3, DistrictName: "Belagavi", CentroidLat: 15.8497, CentroidLng: 74.4977 },
  { DistrictID: 4, DistrictName: "Kalaburagi", CentroidLat: 17.3297, CentroidLng: 76.8343 },
  { DistrictID: 5, DistrictName: "Dakshina Kannada", CentroidLat: 12.9141, CentroidLng: 74.856 },
];

const UNIT_TYPES = [
  { UnitTypeID: 1, UnitTypeName: "SCRB State HQ", CityDistState: "State" },
  { UnitTypeID: 2, UnitTypeName: "Police Station", CityDistState: "City" },
];

const CRIME_HEADS = [
  { CrimeHeadID: 1, CrimeHeadName: "Crimes Against Body" },
  { CrimeHeadID: 2, CrimeHeadName: "Crimes Against Property" },
  { CrimeHeadID: 3, CrimeHeadName: "Crimes Against Women" },
  { CrimeHeadID: 4, CrimeHeadName: "Cyber Crimes" },
  { CrimeHeadID: 5, CrimeHeadName: "Economic Offences" },
  { CrimeHeadID: 6, CrimeHeadName: "Public Order Offences" },
];

const CRIME_SUBHEADS = [
  { CrimeSubHeadID: 1, CrimeHeadID: 1, CrimeSubHeadName: "Murder" },
  { CrimeSubHeadID: 2, CrimeHeadID: 1, CrimeSubHeadName: "Grievous Hurt" },
  { CrimeSubHeadID: 3, CrimeHeadID: 1, CrimeSubHeadName: "Kidnapping" },
  { CrimeSubHeadID: 4, CrimeHeadID: 2, CrimeSubHeadName: "Robbery" },
  { CrimeSubHeadID: 5, CrimeHeadID: 2, CrimeSubHeadName: "House-breaking" },
  { CrimeSubHeadID: 6, CrimeHeadID: 2, CrimeSubHeadName: "Theft" },
  { CrimeSubHeadID: 7, CrimeHeadID: 3, CrimeSubHeadName: "Assault on Women" },
  { CrimeSubHeadID: 8, CrimeHeadID: 3, CrimeSubHeadName: "Dowry Harassment" },
  { CrimeSubHeadID: 9, CrimeHeadID: 3, CrimeSubHeadName: "Domestic Violence" },
  { CrimeSubHeadID: 10, CrimeHeadID: 4, CrimeSubHeadName: "Online Financial Fraud" },
  { CrimeSubHeadID: 11, CrimeHeadID: 4, CrimeSubHeadName: "Identity Theft" },
  { CrimeSubHeadID: 12, CrimeHeadID: 5, CrimeSubHeadName: "Cheating" },
  { CrimeSubHeadID: 13, CrimeHeadID: 5, CrimeSubHeadName: "Criminal Breach of Trust" },
  { CrimeSubHeadID: 14, CrimeHeadID: 6, CrimeSubHeadName: "Rioting" },
  { CrimeSubHeadID: 15, CrimeHeadID: 6, CrimeSubHeadName: "Unlawful Assembly" },
];
const HEINOUS_SUBHEADS = new Set([1, 3, 4, 8]);

const CASE_CATEGORIES = [
  { CaseCategoryID: 1, CategoryName: "FIR" },
  { CaseCategoryID: 2, CategoryName: "Zero FIR" },
  { CaseCategoryID: 3, CategoryName: "UDR" },
  { CaseCategoryID: 4, CategoryName: "PAR" },
];
const GRAVITY = [
  { GravityOffenceID: 1, GravityName: "Heinous" },
  { GravityOffenceID: 2, GravityName: "Non-Heinous" },
];
const STATUSES = [
  { CaseStatusID: 1, StatusName: "Under Investigation" },
  { CaseStatusID: 2, StatusName: "Charge Sheeted" },
  { CaseStatusID: 3, StatusName: "Closed" },
  { CaseStatusID: 4, StatusName: "Undetected" },
];
const DESIGNATIONS = [
  { DesignationID: 1, DesignationName: "SCRB Analyst" },
  { DesignationID: 2, DesignationName: "Station House Officer" },
];
const CASTES = [1, 2, 3, 4, 5].map((id) => ({ CasteID: id, CasteName: ["General", "OBC", "SC", "ST", "Other"][id - 1] }));
const RELIGIONS = [1, 2, 3, 4].map((id) => ({ ReligionID: id, ReligionName: ["Hindu", "Muslim", "Christian", "Other"][id - 1] }));
const OCCUPATIONS = [1, 2, 3, 4, 5].map((id) => ({
  OccupationID: id,
  OccupationName: ["Agriculture", "Business", "Private Employee", "Student", "Daily Wage Labourer"][id - 1],
}));

const FIRST_M = ["Arjun", "Vijay", "Suresh", "Manjunath", "Prakash", "Naveen", "Santosh", "Nagaraj", "Deepak", "Kiran"];
const FIRST_F = ["Anita", "Lakshmi", "Kavya", "Deepa", "Radha", "Pooja", "Manjula", "Nandini", "Priya", "Usha"];
const LAST = ["Gowda", "Reddy", "Naik", "Rao", "Shetty", "Hegde", "Patil", "Kulkarni", "Bhat", "Naidu"];
const name = (g) => `${pick(g === "Female" ? FIRST_F : FIRST_M)} ${pick(LAST)}`;

// --- units (police stations across districts) -------------------------------
const UNITS = [];
UNITS.push({ UnitID: 100, UnitName: "SCRB State HQ, Bengaluru", DistrictID: null, UnitTypeID: 1, Latitude: 12.9716, Longitude: 77.5946 });
let unitId = 101;
for (const d of DISTRICTS) {
  const count = randInt(2, 3);
  for (let i = 0; i < count; i++) {
    UNITS.push({
      UnitID: unitId++,
      UnitName: `${d.DistrictName} ${["Town", "Rural", "East"][i]} Police Station`,
      DistrictID: d.DistrictID,
      UnitTypeID: 2,
      Latitude: jitter(d.CentroidLat, 0.12),
      Longitude: jitter(d.CentroidLng, 0.12),
    });
  }
}
const STATIONS = UNITS.filter((u) => u.UnitTypeID === 2);

// --- repeat offender pool (for the network graph) ---------------------------
const OFFENDER_POOL = Array.from({ length: 12 }, () => {
  const gender = rand() > 0.85 ? "Female" : "Male";
  return { name: name(gender), gender };
});

// --- cases + related --------------------------------------------------------
const CASES = [];
const CHARGESHEETS = [];
const ACCUSED = [];
const VICTIMS = [];
const COMPLAINANTS = [];
let caseId = 1, chargesheetId = 1, accusedId = 1, victimId = 1, complainantId = 1;

for (let i = 0; i < 64; i++) {
  const station = pick(STATIONS);
  const sub = pick(CRIME_SUBHEADS);
  const gravity = HEINOUS_SUBHEADS.has(sub.CrimeSubHeadID) ? (rand() > 0.2 ? 1 : 2) : rand() > 0.85 ? 1 : 2;
  const statusRoll = rand();
  const status = statusRoll < 0.4 ? 1 : statusRoll < 0.7 ? 2 : statusRoll < 0.88 ? 3 : 4;
  const category = rand() > 0.15 ? 1 : pick([2, 3, 4]);
  // Spread across the last ~150 days, weighted toward recent for a lively trend.
  const ageDays = Math.floor(Math.pow(rand(), 1.5) * 150);
  const registered = daysAgoISO(ageDays);

  CASES.push({
    CaseMasterID: caseId,
    CrimeNo: `${category}${String(station.DistrictID).padStart(2, "0")}${String(station.UnitID).padStart(3, "0")}2026${String(i + 1).padStart(4, "0")}`,
    CaseNo: `CR-2026-${String(i + 1).padStart(4, "0")}`,
    CrimeRegisteredDate: registered,
    PoliceStationID: station.UnitID,
    CaseCategoryID: category,
    GravityOffenceID: gravity,
    CrimeMajorHeadID: sub.CrimeHeadID,
    CrimeMinorHeadID: sub.CrimeSubHeadID,
    CaseStatusID: status,
    Latitude: jitter(station.Latitude, 0.03),
    Longitude: jitter(station.Longitude, 0.03),
  });

  // complainant
  COMPLAINANTS.push({
    ComplainantID: complainantId++,
    CaseMasterID: caseId,
    CasteID: pick(CASTES).CasteID,
    ReligionID: pick(RELIGIONS).ReligionID,
    OccupationID: pick(OCCUPATIONS).OccupationID,
  });

  // victims
  for (let v = 0; v < randInt(1, 2); v++) {
    const g = rand() > 0.5 ? "Female" : "Male";
    VICTIMS.push({ VictimMasterID: victimId++, CaseMasterID: caseId, VictimName: name(g), Gender: g });
  }

  // accused — ~70% drawn from the repeat pool for real network patterns
  for (let a = 0; a < randInt(1, 3); a++) {
    const identity = rand() < 0.7 ? pick(OFFENDER_POOL) : { name: name(rand() > 0.85 ? "Female" : "Male"), gender: "Male" };
    ACCUSED.push({ AccusedMasterID: accusedId++, CaseMasterID: caseId, Name: identity.name, Gender: identity.gender });
  }

  // chargesheet for resolved cases
  if (status !== 1) {
    CHARGESHEETS.push({
      ChargesheetID: chargesheetId++,
      CaseMasterID: caseId,
      ReportType: status === 4 ? "Undetected" : status === 3 && rand() < 0.2 ? "False Case" : "Chargesheet",
      ReportDate: daysAgoISO(Math.max(0, ageDays - randInt(10, 40))),
    });
  }
  caseId++;
}

// --- table registry ---------------------------------------------------------
const TABLES = {
  State: [{ StateID: 1, StateName: "Karnataka" }],
  District: DISTRICTS,
  UnitType: UNIT_TYPES,
  Unit: UNITS,
  Rank: [{ RankID: 1, RankName: "ADGP", Hierarchy: 2 }],
  Designation: DESIGNATIONS,
  CrimeHead: CRIME_HEADS,
  CrimeSubHead: CRIME_SUBHEADS,
  CaseCategory: CASE_CATEGORIES,
  GravityOffence: GRAVITY,
  CaseStatusMaster: STATUSES,
  CasteMaster: CASTES,
  ReligionMaster: RELIGIONS,
  OccupationMaster: OCCUPATIONS,
  CaseMaster: CASES,
  ChargesheetDetails: CHARGESHEETS,
  Accused: ACCUSED,
  Victim: VICTIMS,
  ComplainantDetails: COMPLAINANTS,
  AlertAction: [],
  Employee: [],
};

/**
 * Answers a ZCQL query from the in-memory dataset. WHERE clauses are ignored
 * (the demo user is state-level, so real scope filters match everything and
 * lib/* filters/aggregates in JS anyway). Count queries mirror the real
 * Data Store's shape — keyed `COUNT(ROWID)`, see lib/zcqlCount.js — and a
 * query carrying both a `>=` and a `<` date bound is treated as a "prior
 * period" and down-weighted so the dashboard's trend delta reads sensibly.
 */
export function demoQuery(query, tableName) {
  const q = query.toUpperCase();
  const rows = TABLES[tableName] || [];
  if (q.includes("COUNT(")) {
    const isPriorWindow = q.includes(">= '") && q.includes("< '");
    return [{ "COUNT(ROWID)": isPriorWindow ? Math.round(rows.length * 0.4) : rows.length }];
  }
  return rows.map((r) => ({ ...r }));
}

/** No-op Data Store table handle so alert-action writes don't crash in demo mode. */
export function demoTable() {
  return {
    async insertRow(row) {
      return { ROWID: Date.now(), ...row };
    },
    async insertRows(rowsArr) {
      return rowsArr;
    },
    async updateRow(row) {
      return row;
    },
    async deleteRow() {
      return true;
    },
    async deleteRows() {
      return true;
    },
  };
}

/** The state-level analyst returned by the demo login. */
export const DEMO_PASSWORD = "Demo@1234";
export const DEMO_SESSION_USER = {
  employeeId: 1,
  kgid: "KGID100001",
  name: "SCRB Duty Analyst",
  rankName: "ADGP",
  rankHierarchy: 2,
  designationName: "SCRB Analyst",
  districtId: null,
  districtName: null,
  unitId: 100,
  unitName: "SCRB State HQ, Bengaluru",
  isStateLevel: true,
  victimClearance: true,
};
