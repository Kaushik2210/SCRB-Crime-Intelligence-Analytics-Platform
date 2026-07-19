const bcrypt = require("bcryptjs");
const { getTable } = require("./catalystAdminClient");

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
function iso(date) {
  return date.toISOString();
}

const DEMO_PASSWORD = "Demo@1234";

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

async function main() {
  console.log("Seeding KSP Crime Intelligence Platform demo data (Catalyst Data Store)...");

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // --- State -----------------------------------------------------------
  const state = await getTable("State").insertRow({ StateName: "Karnataka" });

  // --- Reference tables --------------------------------------------------
  const caseCategories = await getTable("CaseCategory").insertRows(
    ["FIR", "UDR", "PAR", "Zero FIR"].map((name) => ({ CategoryName: name }))
  );
  const gravityOffences = await getTable("GravityOffence").insertRows(
    ["Heinous", "Non-Heinous"].map((name) => ({ GravityName: name }))
  );
  const caseStatuses = await getTable("CaseStatusMaster").insertRows(
    ["Under Investigation", "Charge Sheeted", "Closed", "Undetected"].map((name) => ({ StatusName: name }))
  );
  const castes = await getTable("CasteMaster").insertRows(CASTES.map((name) => ({ CasteName: name })));
  const religions = await getTable("ReligionMaster").insertRows(RELIGIONS.map((name) => ({ ReligionName: name })));
  const occupations = await getTable("OccupationMaster").insertRows(
    OCCUPATIONS.map((name) => ({ OccupationName: name }))
  );

  const crimeHeadTable = getTable("CrimeHead");
  const crimeSubHeadTable = getTable("CrimeSubHead");
  const crimeHeadMap = new Map();
  const subHeadMap = new Map();
  for (const [headName, subHeads] of Object.entries(CRIME_HEADS)) {
    const head = await crimeHeadTable.insertRow({ CrimeHeadName: headName });
    crimeHeadMap.set(headName, head);
    for (const subName of subHeads) {
      const sub = await crimeSubHeadTable.insertRow({ CrimeHeadID: head.ROWID, CrimeSubHeadName: subName });
      subHeadMap.set(subName, sub);
    }
  }

  const actTable = getTable("Act");
  for (const act of ACTS) {
    await actTable.insertRow({ ActCode: act.code, ActName: act.name });
  }
  const sectionTable = getTable("Section");
  const sectionMap = new Map();
  for (const s of SECTIONS) {
    const section = await sectionTable.insertRow({
      ActCode: s.actCode,
      SectionNumber: s.number,
      SectionDescription: s.description,
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
        const section = sectionMap.get(key);
        await crimeHeadActSectionTable.insertRow({
          CrimeHeadID: head.ROWID,
          ActCode: ref.actCode,
          SectionID: section.ROWID,
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
    rankNames.map((name, i) => ({ RankName: name, Hierarchy: i + 1 }))
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
    designationDefs.map((d) => ({ DesignationName: d.name, SortOrder: d.order }))
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
    return employeeTable.insertRow({
      KGID: `KGID${kgidCounter++}`,
      Name: syntheticName(gender),
      DOB: iso(new Date(1965 + randInt(0, 35), randInt(0, 11), randInt(1, 28))),
      Gender: gender,
      DistrictID: opts.districtId,
      UnitID: opts.unitId,
      RankID: rankByName.get(opts.rank).ROWID,
      DesignationID: designationByName.get(opts.designation).ROWID,
      PasswordHash: passwordHash,
      VictimClearance: opts.victimClearance,
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

  console.log(`Created ${analysts.length + stationOfficers.length + districtRecords.length} employees.`);

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
  const caseMasterTable = getTable("CaseMaster");
  const complainantTable = getTable("ComplainantDetails");
  const victimTable = getTable("Victim");
  const accusedTable = getTable("Accused");
  const actSectionAssociationTable = getTable("ActSectionAssociation");
  const arrestSurrenderTable = getTable("ArrestSurrender");
  const chargesheetTable = getTable("ChargesheetDetails");

  const CASE_COUNT = 420;
  const districtSerial = new Map();
  let caseCounter = 0;

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
    const categoryCode = category.CategoryName === "FIR" ? "1" : category.CategoryName === "Zero FIR" ? "2" : category.CategoryName === "UDR" ? "3" : "4";
    const crimeNo = `${categoryCode}${String(districtIndex).padStart(4, "0")}${String(stationIndex).padStart(4, "0")}${registeredDate.getFullYear()}${String(serial).padStart(5, "0")}`;

    const lat = jitter(station.Latitude ?? district.CentroidLat, 0.03);
    const lng = jitter(station.Longitude ?? district.CentroidLng, 0.03);

    const caseRecord = await caseMasterTable.insertRow({
      CrimeNo: crimeNo,
      CaseNo: `CR-${registeredDate.getFullYear()}-${String(serial).padStart(4, "0")}`,
      CrimeRegisteredDate: iso(registeredDate),
      PolicePersonID: io.ROWID,
      PoliceStationID: station.ROWID,
      CaseCategoryID: category.ROWID,
      GravityOffenceID: gravity.ROWID,
      CrimeMajorHeadID: head.ROWID,
      CrimeMinorHeadID: sub.ROWID,
      CaseStatusID: status.ROWID,
      IncidentFromDate: iso(incidentFrom),
      InfoReceivedPSDate: iso(infoReceived),
      Latitude: lat,
      Longitude: lng,
      BriefFacts: `Synthetic case record: a ${subName.toLowerCase()} incident reported near ${station.UnitName}, under investigation by the local station.`,
    });
    caseCounter++;

    // Complainant
    const complainantGender = rand() > 0.5 ? "Male" : "Female";
    await complainantTable.insertRow({
      CaseMasterID: caseRecord.ROWID,
      Name: syntheticName(complainantGender),
      Age: randInt(18, 70),
      Gender: complainantGender,
      OccupationID: pick(occupations).ROWID,
      ReligionID: pick(religions).ROWID,
      CasteID: pick(castes).ROWID,
    });

    // Victims
    const victimCount = randInt(1, 2);
    const victimIds = [];
    for (let v = 0; v < victimCount; v++) {
      const victimGender = rand() > 0.55 ? "Female" : "Male";
      const victim = await victimTable.insertRow({
        CaseMasterID: caseRecord.ROWID,
        VictimName: syntheticName(victimGender),
        Age: randInt(5, 75),
        Gender: victimGender,
        VictimPolice: rand() > 0.95,
      });
      victimIds.push(victim.ROWID);
    }

    // Accused — ~70% drawn from the repeat-offender pool to create real network
    // patterns; the rest are one-off synthetic identities.
    const accusedCount = randInt(1, 3);
    const accusedIds = [];
    for (let a = 0; a < accusedCount; a++) {
      const useRepeat = rand() < 0.7;
      const identity = useRepeat ? pick(repeatOffenderPool) : {
        name: syntheticName(rand() > 0.9 ? "Female" : "Male"),
        age: randInt(18, 55),
        gender: rand() > 0.9 ? "Female" : "Male",
      };
      const accused = await accusedTable.insertRow({
        CaseMasterID: caseRecord.ROWID,
        Name: identity.name,
        Age: identity.age,
        Gender: identity.gender,
        PersonID: `A${a + 1}`,
      });
      accusedIds.push(accused.ROWID);
    }

    // Act/Section association based on the sub-head.
    const refs = SUBHEAD_SECTIONS[subName] ?? [];
    for (const ref of refs) {
      const section = sectionMap.get(`${ref.actCode}-${ref.number}`);
      await actSectionAssociationTable.insertRow({
        CaseMasterID: caseRecord.ROWID,
        ActCode: ref.actCode,
        SectionID: section.ROWID,
      });
    }

    // Arrest/Surrender events for ~60% of cases with accused.
    if (rand() < 0.6 && accusedIds.length > 0) {
      const eventDate = new Date(registeredDate);
      eventDate.setDate(eventDate.getDate() + randInt(1, 30));
      for (const accusedId of accusedIds) {
        if (rand() < 0.75) {
          await arrestSurrenderTable.insertRow({
            CaseMasterID: caseRecord.ROWID,
            IOID: io.ROWID,
            StateID: state.ROWID,
            DistrictID: district.ROWID,
            UnitID: station.ROWID,
            AccusedMasterID: accusedId,
            IsAccused: true,
            IsComplainantAccused: false,
            EventType: rand() > 0.85 ? "Surrender" : "Arrest",
            EventDate: iso(eventDate),
          });
        }
      }
    }

    // Chargesheet for resolved cases.
    if (status.StatusName === "Charge Sheeted" || status.StatusName === "Closed" || status.StatusName === "Undetected") {
      const reportDate = new Date(registeredDate);
      reportDate.setDate(reportDate.getDate() + randInt(30, 120));
      const reportType = status.StatusName === "Undetected" ? "Undetected" : status.StatusName === "Closed" && rand() < 0.2 ? "False Case" : "Chargesheet";
      await chargesheetTable.insertRow({
        CaseMasterID: caseRecord.ROWID,
        ReportType: reportType,
        ReportDate: iso(reportDate),
        EmployeeID: io.ROWID,
      });
    }

    if (caseCounter % 50 === 0) {
      console.log(`  ...${caseCounter}/${CASE_COUNT} cases seeded`);
    }
  }

  console.log(`Seeded ${caseCounter} CaseMaster records with linked victims, accused, and arrests.`);
  console.log("\nDemo login credentials (all use password: Demo@1234):");
  console.log(`  SCRB Analyst (state-level):        ${analysts[0].KGID}`);
  console.log(`  District Officer (SP, has clearance): ${districtSPs[0].KGID}`);
  console.log(`  Station Officer (no clearance):    ${stationOfficers[0].KGID}`);
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
