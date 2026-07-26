const bcrypt = require("bcryptjs");

// ---------------------------------------------------------------------------
// Small deterministic PRNG so re-running the seed produces a stable, reviewable
// dataset instead of a different random sample every time.
// ---------------------------------------------------------------------------
let seedState = 42;
function rand() {
  seedState = (seedState * 1103515245 + 12345) & 0x7fffffff;
  return seedState / 0x7fffffff;
}
function randInt(min, max) {
  return Math.floor(rand() * (max - min + 1)) + min;
}
function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}
function jitter(value, spread) {
  return value + (rand() - 0.5) * 2 * spread;
}
function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}
/**
 * Catalyst's Data Store rejects ISO-8601 strings ("Invalid input value ...
 * datetime value expected") — DateTime columns want "YYYY-MM-DD HH:MM:SS" and
 * Date columns want "YYYY-MM-DD".
 */
function dt(date) {
  const d = new Date(date);
  const p = (n) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ` +
    `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`
  );
}

function dateOnly(date) {
  return dt(date).slice(0, 10);
}

const DEMO_PASSWORD = "Demo@1234";

/** The ER diagram stores gender as a numeric lookup id (GenderID). */
const GENDER_ID = { Male: 1, Female: 2, Transgender: 3 };

// ---------------------------------------------------------------------------
// Synthetic name pools (fictional — never real people)
// ---------------------------------------------------------------------------
const FIRST_NAMES_M = [
  "Arjun", "Vijay", "Suresh", "Ramesh", "Manjunath", "Prakash", "Naveen", "Girish",
  "Santosh", "Raghavendra", "Nagaraj", "Basavaraj", "Chandan", "Deepak", "Harish",
  "Kiran", "Lokesh", "Mahesh", "Nithin", "Pavan", "Rakesh", "Sachin", "Umesh", "Vinay",
];
const FIRST_NAMES_F = [
  "Anita", "Sunita", "Lakshmi", "Kavya", "Deepa", "Geeta", "Radha", "Shwetha",
  "Pooja", "Rekha", "Manjula", "Nandini", "Priya", "Sowmya", "Vidya", "Asha",
  "Chaitra", "Divya", "Jyothi", "Kavitha", "Meena", "Nagamma", "Roopa", "Usha",
];
const LAST_NAMES = [
  "Gowda", "Reddy", "Naik", "Rao", "Shetty", "Hegde", "Patil", "Kulkarni",
  "Desai", "Bhat", "Iyer", "Achar", "Poojary", "Naidu", "Setty", "Malagi",
];

function syntheticName(gender) {
  const first = pick(gender === "Male" ? FIRST_NAMES_M : FIRST_NAMES_F);
  const last = pick(LAST_NAMES);
  return `${first} ${last}`;
}

// ---------------------------------------------------------------------------
// Karnataka districts (approximate real centroids)
// ---------------------------------------------------------------------------
const DISTRICTS = [
  { name: "Bengaluru Urban", lat: 12.9716, lng: 77.5946 },
  { name: "Mysuru", lat: 12.2958, lng: 76.6394 },
  { name: "Belagavi", lat: 15.8497, lng: 74.4977 },
  { name: "Ballari", lat: 15.1394, lng: 76.9214 },
  { name: "Kalaburagi", lat: 17.3297, lng: 76.8343 },
  { name: "Dakshina Kannada", lat: 12.9141, lng: 74.856 },
  { name: "Dharwad", lat: 15.4589, lng: 75.0078 },
  { name: "Shivamogga", lat: 13.9299, lng: 75.5681 },
  { name: "Tumakuru", lat: 13.3379, lng: 77.1173 },
  { name: "Udupi", lat: 13.3409, lng: 74.7421 },
  { name: "Hassan", lat: 13.0072, lng: 76.1004 },
  { name: "Vijayapura", lat: 16.8302, lng: 75.71 },
  { name: "Raichur", lat: 16.2076, lng: 77.3463 },
  { name: "Bidar", lat: 17.9104, lng: 77.5199 },
  { name: "Chikkamagaluru", lat: 13.3161, lng: 75.772 },
];

const STATION_SUFFIXES = ["Town", "Rural", "East", "West", "North", "Traffic"];

const CRIME_HEADS = {
  "Crimes Against Body": ["Murder", "Attempt to Murder", "Grievous Hurt", "Kidnapping"],
  "Crimes Against Property": ["Robbery", "House-breaking", "Theft", "Dacoity"],
  "Crimes Against Women": ["Assault on Women", "Dowry Harassment", "Domestic Violence"],
  "Cyber Crimes": ["Online Financial Fraud", "Cyberstalking", "Identity Theft"],
  "Economic Offences": ["Cheating", "Criminal Breach of Trust", "Counterfeiting"],
  "Public Order Offences": ["Rioting", "Unlawful Assembly"],
};

const HEINOUS_SUBHEADS = new Set([
  "Murder", "Attempt to Murder", "Kidnapping", "Robbery", "Dacoity", "Dowry Harassment",
]);

// Act/Section reference data + which sections typically apply to which sub-head.
const ACTS = [
  { code: "IPC", name: "Indian Penal Code, 1860" },
  { code: "BNS", name: "Bharatiya Nyaya Sanhita, 2023" },
  { code: "ITACT", name: "Information Technology Act, 2000" },
  { code: "NDPS", name: "Narcotic Drugs and Psychotropic Substances Act, 1985" },
];

const SECTIONS = [
  { actCode: "IPC", number: "302", description: "Punishment for murder" },
  { actCode: "IPC", number: "307", description: "Attempt to murder" },
  { actCode: "IPC", number: "326", description: "Voluntarily causing grievous hurt" },
  { actCode: "IPC", number: "363", description: "Punishment for kidnapping" },
  { actCode: "IPC", number: "392", description: "Punishment for robbery" },
  { actCode: "IPC", number: "457", description: "House-breaking by night" },
  { actCode: "IPC", number: "380", description: "Theft in a dwelling house" },
  { actCode: "IPC", number: "395", description: "Punishment for dacoity" },
  { actCode: "IPC", number: "498A", description: "Cruelty by husband or relatives" },
  { actCode: "IPC", number: "354", description: "Assault on a woman with intent to outrage modesty" },
  { actCode: "IPC", number: "420", description: "Cheating and dishonestly inducing delivery of property" },
  { actCode: "IPC", number: "406", description: "Punishment for criminal breach of trust" },
  { actCode: "IPC", number: "143", description: "Punishment for unlawful assembly" },
  { actCode: "IPC", number: "147", description: "Punishment for rioting" },
  { actCode: "ITACT", number: "66C", description: "Punishment for identity theft" },
  { actCode: "ITACT", number: "66D", description: "Cheating by personation using computer resource" },
];

const SUBHEAD_SECTIONS = {
  Murder: [{ actCode: "IPC", number: "302" }],
  "Attempt to Murder": [{ actCode: "IPC", number: "307" }],
  "Grievous Hurt": [{ actCode: "IPC", number: "326" }],
  Kidnapping: [{ actCode: "IPC", number: "363" }],
  Robbery: [{ actCode: "IPC", number: "392" }],
  "House-breaking": [{ actCode: "IPC", number: "457" }, { actCode: "IPC", number: "380" }],
  Theft: [{ actCode: "IPC", number: "380" }],
  Dacoity: [{ actCode: "IPC", number: "395" }],
  "Assault on Women": [{ actCode: "IPC", number: "354" }],
  "Dowry Harassment": [{ actCode: "IPC", number: "498A" }],
  "Domestic Violence": [{ actCode: "IPC", number: "498A" }],
  "Online Financial Fraud": [{ actCode: "ITACT", number: "66D" }, { actCode: "IPC", number: "420" }],
  Cyberstalking: [{ actCode: "ITACT", number: "66C" }],
  "Identity Theft": [{ actCode: "ITACT", number: "66C" }],
  Cheating: [{ actCode: "IPC", number: "420" }],
  "Criminal Breach of Trust": [{ actCode: "IPC", number: "406" }],
  Counterfeiting: [{ actCode: "IPC", number: "420" }],
  Rioting: [{ actCode: "IPC", number: "147" }],
  "Unlawful Assembly": [{ actCode: "IPC", number: "143" }],
};

const CASTES = ["General", "OBC", "SC", "ST", "Other"];
const RELIGIONS = ["Hindu", "Muslim", "Christian", "Sikh", "Jain", "Other"];
const OCCUPATIONS = [
  "Agriculture", "Business", "Private Employee", "Government Employee", "Student",
  "Homemaker", "Unemployed", "Daily Wage Labourer", "Self-Employed", "Other",
];

/**
 * Catalyst's Data Store caps how many rows one insert call accepts, so large
 * batches are split. Returns the inserted rows (with their generated ROWIDs)
 * in the same order they were passed in — callers rely on that ordering to
 * wire up foreign keys.
 */
const INSERT_CHUNK_SIZE = 100;
async function insertInChunks(table, rows, label, log) {
  const inserted = [];
  for (let i = 0; i < rows.length; i += INSERT_CHUNK_SIZE) {
    const chunk = rows.slice(i, i + INSERT_CHUNK_SIZE);
    const result = await table.insertRows(chunk);
    inserted.push(...result);
    log(`  ${label}: ${inserted.length}/${rows.length}`);
  }
  return inserted;
}

/**
 * Seeds the whole synthetic dataset.
 *
 * `getTable` is injected rather than imported so this can run either from the
 * CLI (via scripts/catalystAdminClient.js and OAuth self-client credentials)
 * or from inside a Catalyst-served request (via lib/zcql.js), which is the
 * only path available when self-client OAuth credentials aren't configured.
 */
async function runSeed({ getTable, log = console.log }) {
  log("Seeding KSP Crime Intelligence Platform demo data (Catalyst Data Store)...");

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // --- State -----------------------------------------------------------
  const state = await getTable("State").insertRow({ StateName: "Karnataka" });

  // --- Reference tables --------------------------------------------------
  const caseCategories = await getTable("CaseCategory").insertRows(
    ["FIR", "UDR", "PAR", "Zero FIR"].map((name) => ({ LookupValue: name }))
  );
  const gravityOffences = await getTable("GravityOffence").insertRows(
    ["Heinous", "Non-Heinous"].map((name) => ({ LookupValue: name }))
  );
  const caseStatuses = await getTable("CaseStatusMaster").insertRows(
    ["Under Investigation", "Charge Sheeted", "Closed", "Undetected"].map((name) => ({ CaseStatusName: name }))
  );
  const castes = await getTable("CasteMaster").insertRows(CASTES.map((name) => ({ caste_master_name: name })));
  const religions = await getTable("ReligionMaster").insertRows(RELIGIONS.map((name) => ({ ReligionName: name })));
  const occupations = await getTable("OccupationMaster").insertRows(
    OCCUPATIONS.map((name) => ({ OccupationName: name }))
  );

  const crimeHeadTable = getTable("CrimeHead");
  const crimeSubHeadTable = getTable("CrimeSubHead");
  const crimeHeadMap = new Map();
  const subHeadMap = new Map();
  for (const [headName, subHeads] of Object.entries(CRIME_HEADS)) {
    const head = await crimeHeadTable.insertRow({ CrimeGroupName: headName, Active: true });
    crimeHeadMap.set(headName, head);
    let seq = 1;
    for (const subName of subHeads) {
      // Per the ER diagram, CrimeSubHead's own name column is `CrimeHeadName`.
      const sub = await crimeSubHeadTable.insertRow({
        CrimeHeadID: head.ROWID,
        CrimeHeadName: subName,
        SeqID: seq++,
      });
      subHeadMap.set(subName, sub);
    }
  }

  const actTable = getTable("Act");
  for (const act of ACTS) {
    await actTable.insertRow({ ActCode: act.code, ActDescription: act.name, ShortName: act.code, Active: true });
  }
  const sectionTable = getTable("Section");
  const sectionMap = new Map();
  for (const s of SECTIONS) {
    const section = await sectionTable.insertRow({
      ActCode: s.actCode,
      SectionCode: s.number,
      SectionDescription: s.description,
      Active: true,
    });
    sectionMap.set(`${s.actCode}-${s.number}`, section);
  }
  // Reference mapping: crime head -> its member sub-heads' typical act/sections.
  const crimeHeadActSectionTable = getTable("CrimeHeadActSection");
  for (const [headName, subHeads] of Object.entries(CRIME_HEADS)) {
    const head = crimeHeadMap.get(headName);
    const seen = new Set();
    for (const subName of subHeads) {
      for (const ref of SUBHEAD_SECTIONS[subName] ?? []) {
        const key = `${ref.actCode}-${ref.number}`;
        if (seen.has(key)) continue;
        seen.add(key);
        await crimeHeadActSectionTable.insertRow({
          CrimeHeadID: head.ROWID,
          ActCode: ref.actCode,
          SectionCode: ref.number,
        });
      }
    }
  }

  // --- Ranks & Designations ------------------------------------------------
  const rankNames = [
    "DGP", "ADGP", "IGP", "DIG", "SP", "Addl. SP", "DySP", "Inspector",
    "Sub-Inspector", "ASI", "Head Constable", "Police Constable",
  ];
  const ranks = await getTable("Rank").insertRows(
    rankNames.map((name, i) => ({ RankName: name, Hierarchy: i + 1, Active: true }))
  );
  const rankByName = new Map(ranks.map((r) => [r.RankName, r]));

  const designationDefs = [
    { name: "SCRB Analyst", order: 1 },
    { name: "District Superintendent", order: 2 },
    { name: "Circle Inspector", order: 3 },
    { name: "Station House Officer", order: 4 },
    { name: "Investigating Officer", order: 5 },
    { name: "Constabulary Staff", order: 6 },
  ];
  const designations = await getTable("Designation").insertRows(
    designationDefs.map((d) => ({ DesignationName: d.name, SortOrder: d.order, Active: true }))
  );
  const designationByName = new Map(designations.map((d) => [d.DesignationName, d]));

  // --- Unit types & units ---------------------------------------------------
  const unitTypeTable = getTable("UnitType");
  const stateUnitType = await unitTypeTable.insertRow({
    UnitTypeName: "SCRB State HQ",
    Hierarchy: 1,
    CityDistState: "State",
  });
  const districtUnitType = await unitTypeTable.insertRow({
    UnitTypeName: "District SP Office",
    Hierarchy: 2,
    CityDistState: "District",
  });
  const stationUnitType = await unitTypeTable.insertRow({
    UnitTypeName: "Police Station",
    Hierarchy: 3,
    CityDistState: "City",
  });

  const unitTable = getTable("Unit");
  const stateHQ = await unitTable.insertRow({
    UnitName: "SCRB State Headquarters, Bengaluru",
    UnitTypeID: stateUnitType.ROWID,
    StateID: state.ROWID,
    Latitude: 12.9716,
    Longitude: 77.5946,
  });

  const districtTable = getTable("District");
  const districtRecords = [];
  const districtOffices = new Map();
  const stationsByDistrict = new Map();

  for (const d of DISTRICTS) {
    const district = await districtTable.insertRow({
      DistrictName: d.name,
      StateID: state.ROWID,
      CentroidLat: d.lat,
      CentroidLng: d.lng,
    });
    districtRecords.push(district);

    const spOffice = await unitTable.insertRow({
      UnitName: `${d.name} District SP Office`,
      UnitTypeID: districtUnitType.ROWID,
      DistrictID: district.ROWID,
      StateID: state.ROWID,
      Latitude: d.lat,
      Longitude: d.lng,
    });
    districtOffices.set(district.ROWID, spOffice);

    const stationCount = randInt(2, 4);
    const stations = [];
    for (let i = 0; i < stationCount; i++) {
      const suffix = STATION_SUFFIXES[i % STATION_SUFFIXES.length];
      const station = await unitTable.insertRow({
        UnitName: `${d.name} ${suffix} Police Station`,
        UnitTypeID: stationUnitType.ROWID,
        DistrictID: district.ROWID,
        StateID: state.ROWID,
        ParentUnitID: spOffice.ROWID,
        Latitude: jitter(d.lat, 0.15),
        Longitude: jitter(d.lng, 0.15),
      });
      stations.push(station);
    }
    stationsByDistrict.set(district.ROWID, stations);
  }

  // --- Employees --------------------------------------------------------
  const employeeTable = getTable("Employee");
  const analysts = [];
  const districtSPs = [];
  const stationOfficers = [];
  let kgidCounter = 100001;

  async function createEmployee(opts) {
    const gender = rand() > 0.75 ? "Female" : "Male";
    const dobDate = new Date(1965 + randInt(0, 35), randInt(0, 11), randInt(1, 28));
    const name = syntheticName(gender);
    return employeeTable.insertRow({
      KGID: `KGID${kgidCounter++}`,
      // ER-diagram columns...
      FirstName: name,
      EmployeeDOB: dateOnly(dobDate),
      GenderID: GENDER_ID[gender],
      AppointmentDate: dateOnly(daysAgo(randInt(400, 7000))),
      PhysicallyChallenged: false,
      // ...alongside the app-specific auth/display columns (not modelled in the
      // ER diagram, but required by lib/auth.js and lib/masking.js).
      Name: name,
      DOB: dt(dobDate),
      Gender: gender,
      PasswordHash: passwordHash,
      VictimClearance: opts.victimClearance,
      DistrictID: opts.districtId,
      UnitID: opts.unitId,
      RankID: rankByName.get(opts.rank).ROWID,
      DesignationID: designationByName.get(opts.designation).ROWID,
    });
  }

  for (let i = 0; i < 5; i++) {
    const rank = i === 0 ? "ADGP" : "IGP";
    const emp = await createEmployee({
      rank,
      designation: "SCRB Analyst",
      districtId: null,
      unitId: stateHQ.ROWID,
      victimClearance: true,
    });
    analysts.push(emp);
  }

  for (const district of districtRecords) {
    const spOffice = districtOffices.get(district.ROWID);
    const sp = await createEmployee({
      rank: "SP",
      designation: "District Superintendent",
      districtId: district.ROWID,
      unitId: spOffice.ROWID,
      victimClearance: true,
    });
    districtSPs.push(sp);

    const stations = stationsByDistrict.get(district.ROWID);
    for (const station of stations) {
      const sho = await createEmployee({
        rank: "Inspector",
        designation: "Station House Officer",
        districtId: district.ROWID,
        unitId: station.ROWID,
        victimClearance: false,
      });
      stationOfficers.push(sho);

      const ioCount = randInt(1, 2);
      for (let i = 0; i < ioCount; i++) {
        const io = await createEmployee({
          rank: pick(["Sub-Inspector", "ASI"]),
          designation: "Investigating Officer",
          districtId: district.ROWID,
          unitId: station.ROWID,
          victimClearance: false,
        });
        stationOfficers.push(io);
      }
    }
  }

  log(`Created ${analysts.length + stationOfficers.length + districtRecords.length} employees.`);

  // --- Repeat-offender pool -------------------------------------------------
  // A shared pool of accused identities reused across multiple cases so the
  // network/link-analysis screen has real repeat-offender + MO patterns.
  const repeatOffenderPool = Array.from({ length: 50 }, () => {
    const gender = rand() > 0.9 ? "Female" : "Male";
    return {
      name: syntheticName(gender),
      age: randInt(19, 55),
      gender,
    };
  });
  // --- Case data --------------------------------------------------------
  // Rows are built in memory first and written with chunked `insertRows`
  // calls. Catalyst's Data Store is a remote HTTP API, so the previous
  // row-at-a-time approach meant ~8 round-trips per case (~3,400 total) —
  // minutes of latency, and far too slow to run inside a single request.
  const caseMasterTable = getTable("CaseMaster");
  const complainantTable = getTable("ComplainantDetails");
  const victimTable = getTable("Victim");
  const accusedTable = getTable("Accused");
  const actSectionAssociationTable = getTable("ActSectionAssociation");
  const arrestSurrenderTable = getTable("ArrestSurrender");
  const chargesheetTable = getTable("ChargesheetDetails");

  const CASE_COUNT = 420;
  const districtSerial = new Map();

  const casePayloads = [];
  const caseExtras = [];

  for (let i = 0; i < CASE_COUNT; i++) {
    const district = pick(districtRecords);
    const stations = stationsByDistrict.get(district.ROWID);
    const station = pick(stations);
    const districtIndex = districtRecords.indexOf(district) + 1;
    const stationIndex = stations.indexOf(station) + 1;

    const headName = pick(Object.keys(CRIME_HEADS));
    const head = crimeHeadMap.get(headName);
    const subName = pick(CRIME_HEADS[headName]);
    const sub = subHeadMap.get(subName);

    const registeredDate = daysAgo(randInt(1, 730));
    const incidentFrom = new Date(registeredDate);
    incidentFrom.setDate(incidentFrom.getDate() - randInt(0, 3));
    const infoReceived = new Date(incidentFrom);
    infoReceived.setHours(infoReceived.getHours() + randInt(1, 48));

    const gravity = HEINOUS_SUBHEADS.has(subName)
      ? (rand() > 0.15 ? gravityOffences[0] : gravityOffences[1])
      : (rand() > 0.85 ? gravityOffences[0] : gravityOffences[1]);

    const statusRoll = rand();
    const status = statusRoll < 0.35 ? caseStatuses[0] : statusRoll < 0.75 ? caseStatuses[1] : statusRoll < 0.9 ? caseStatuses[2] : caseStatuses[3];

    const category = rand() > 0.1 ? caseCategories[0] : pick(caseCategories.slice(1));

    // Investigating officer: prefer someone posted at this station.
    const stationIOs = stationOfficers.filter((o) => o.UnitID === station.ROWID);
    const io = stationIOs.length > 0 ? pick(stationIOs) : pick(stationOfficers);

    const serial = (districtSerial.get(district.ROWID) ?? 0) + 1;
    districtSerial.set(district.ROWID, serial);
    const categoryName = category.LookupValue;
    const categoryCode = categoryName === "FIR" ? "1" : categoryName === "Zero FIR" ? "2" : categoryName === "UDR" ? "3" : "4";
    const crimeNo = `${categoryCode}${String(districtIndex).padStart(4, "0")}${String(stationIndex).padStart(4, "0")}${registeredDate.getFullYear()}${String(serial).padStart(5, "0")}`;

    const lat = jitter(station.Latitude ?? district.CentroidLat, 0.03);
    const lng = jitter(station.Longitude ?? district.CentroidLng, 0.03);

    casePayloads.push({
      CrimeNo: crimeNo,
      CaseNo: `CR-${registeredDate.getFullYear()}-${String(serial).padStart(4, "0")}`,
      CrimeRegisteredDate: dateOnly(registeredDate),
      PolicePersonID: io.ROWID,
      PoliceStationID: station.ROWID,
      CaseCategoryID: category.ROWID,
      GravityOffenceID: gravity.ROWID,
      CrimeMajorHeadID: head.ROWID,
      CrimeMinorHeadID: sub.ROWID,
      CaseStatusID: status.ROWID,
      IncidentFromDate: dt(incidentFrom),
      IncidentToDate: dt(incidentFrom),
      InfoReceivedPSDate: dt(infoReceived),
      // Lowercase per the ER diagram.
      latitude: lat,
      longitude: lng,
      BriefFacts: `Synthetic case record: a ${subName.toLowerCase()} incident reported near ${station.UnitName}, under investigation by the local station.`,
    });

    // Complainant
    const complainantGender = rand() > 0.5 ? "Male" : "Female";
    const complainant = {
      ComplainantName: syntheticName(complainantGender),
      AgeYear: randInt(18, 70),
      GenderID: GENDER_ID[complainantGender],
      OccupationID: pick(occupations).ROWID,
      ReligionID: pick(religions).ROWID,
      CasteID: pick(castes).ROWID,
    };

    // Victims
    const victims = [];
    const victimCount = randInt(1, 2);
    for (let v = 0; v < victimCount; v++) {
      const victimGender = rand() > 0.55 ? "Female" : "Male";
      victims.push({
        VictimName: syntheticName(victimGender),
        AgeYear: randInt(5, 75),
        GenderID: GENDER_ID[victimGender],
        // ER diagram: VarChar holding "1" (police) or "0".
        VictimPolice: rand() > 0.95 ? "1" : "0",
      });
    }

    // Accused — ~70% drawn from the repeat-offender pool to create real network
    // patterns; the rest are one-off synthetic identities.
    const accused = [];
    const accusedCount = randInt(1, 3);
    for (let a = 0; a < accusedCount; a++) {
      const useRepeat = rand() < 0.7;
      const identity = useRepeat ? pick(repeatOffenderPool) : {
        name: syntheticName(rand() > 0.9 ? "Female" : "Male"),
        age: randInt(18, 55),
        gender: rand() > 0.9 ? "Female" : "Male",
      };
      accused.push({
        AccusedName: identity.name,
        AgeYear: identity.age,
        GenderID: GENDER_ID[identity.gender],
        PersonID: `A${a + 1}`,
      });
    }

    // Act/Section association based on the sub-head.
    // ER diagram: ActID/SectionID hold the act code and section code.
    const actSections = (SUBHEAD_SECTIONS[subName] ?? []).map((ref, idx) => ({
      ActID: ref.actCode,
      SectionID: ref.number,
      ActOrderID: idx + 1,
      SectionOrderID: idx + 1,
    }));

    // Arrest/Surrender events for ~60% of cases with accused.
    let arrestPlan = null;
    if (rand() < 0.6 && accused.length > 0) {
      const eventDate = new Date(registeredDate);
      eventDate.setDate(eventDate.getDate() + randInt(1, 30));
      arrestPlan = {
        eventDate: dateOnly(eventDate),
        // Which of this case's accused were actually picked up.
        includeFlags: accused.map(() => rand() < 0.75),
        // 1 = Arrest, 2 = Surrender (lookup code per the ER diagram).
        typeIds: accused.map(() => (rand() > 0.85 ? 2 : 1)),
      };
    }

    // Chargesheet for resolved cases.
    let chargesheetPlan = null;
    const statusName = status.CaseStatusName;
    if (statusName === "Charge Sheeted" || statusName === "Closed" || statusName === "Undetected") {
      const reportDate = new Date(registeredDate);
      reportDate.setDate(reportDate.getDate() + randInt(30, 120));
      const reportType = statusName === "Undetected" ? "Undetected" : statusName === "Closed" && rand() < 0.2 ? "False Case" : "Chargesheet";
      chargesheetPlan = {
        // ER diagram: cstype is a single char — A=Chargesheet, B=False Case, C=Undetected.
        cstype: reportType === "Chargesheet" ? "A" : reportType === "False Case" ? "B" : "C",
        csdate: dt(reportDate),
        PolicePersonID: io.ROWID,
      };
    }

    caseExtras.push({ complainant, victims, accused, actSections, arrestPlan, chargesheetPlan, io, station, district });
  }

  const insertedCases = await insertInChunks(caseMasterTable, casePayloads, "CaseMaster", log);
  const caseCounter = insertedCases.length;

  // Children that don't need any generated id other than the case's.
  const complainantRows = [];
  const victimRows = [];
  const actSectionRows = [];
  const chargesheetRows = [];
  // Accused rows are inserted first (arrests reference AccusedMasterID), so
  // track which case + plan each one belongs to in insertion order.
  const accusedRows = [];
  const accusedOwners = [];

  insertedCases.forEach((caseRow, i) => {
    const x = caseExtras[i];
    const caseId = caseRow.ROWID;
    complainantRows.push({ CaseMasterID: caseId, ...x.complainant });
    for (const v of x.victims) victimRows.push({ CaseMasterID: caseId, ...v });
    for (const a of x.actSections) actSectionRows.push({ CaseMasterID: caseId, ...a });
    if (x.chargesheetPlan) chargesheetRows.push({ CaseMasterID: caseId, ...x.chargesheetPlan });
    x.accused.forEach((a, ai) => {
      accusedRows.push({ CaseMasterID: caseId, ...a });
      accusedOwners.push({ caseId, extras: x, accusedIndex: ai });
    });
  });

  const insertedAccused = await insertInChunks(accusedTable, accusedRows, "Accused", log);

  const arrestRows = [];
  insertedAccused.forEach((accusedRow, idx) => {
    const owner = accusedOwners[idx];
    const plan = owner.extras.arrestPlan;
    if (!plan || !plan.includeFlags[owner.accusedIndex]) return;
    arrestRows.push({
      CaseMasterID: owner.caseId,
      IOID: owner.extras.io.ROWID,
      ArrestSurrenderStateId: state.ROWID,
      ArrestSurrenderDistrictId: owner.extras.district.ROWID,
      PoliceStationID: owner.extras.station.ROWID,
      AccusedMasterID: accusedRow.ROWID,
      IsAccused: true,
      IsComplainantAccused: false,
      ArrestSurrenderTypeID: plan.typeIds[owner.accusedIndex],
      ArrestSurrenderDate: plan.eventDate,
    });
  });

  await insertInChunks(complainantTable, complainantRows, "ComplainantDetails", log);
  await insertInChunks(victimTable, victimRows, "Victim", log);
  await insertInChunks(actSectionAssociationTable, actSectionRows, "ActSectionAssociation", log);
  await insertInChunks(arrestSurrenderTable, arrestRows, "ArrestSurrender", log);
  await insertInChunks(chargesheetTable, chargesheetRows, "ChargesheetDetails", log);

  log(`Seeded ${caseCounter} CaseMaster records with linked victims, accused, and arrests.`);

  const credentials = {
    password: DEMO_PASSWORD,
    analystKgid: analysts[0].KGID,
    districtOfficerKgid: districtSPs[0].KGID,
    stationOfficerKgid: stationOfficers[0].KGID,
  };
  log("Done.");
  return { caseCount: caseCounter, credentials };
}

module.exports = { runSeed };

// CLI entry point — needs OAuth self-client credentials (see
// scripts/catalystAdminClient.js). Not used when seeding via the app.
if (require.main === module) {
  const { getTable } = require("./catalystAdminClient");
  runSeed({ getTable })
    .then((r) => {
      console.log("\nDemo login credentials (all use password: %s):", r.credentials.password);
      console.log(`  SCRB Analyst (state-level):           ${r.credentials.analystKgid}`);
      console.log(`  District Officer (SP, has clearance): ${r.credentials.districtOfficerKgid}`);
      console.log(`  Station Officer (no clearance):       ${r.credentials.stationOfficerKgid}`);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
