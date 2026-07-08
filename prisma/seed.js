const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

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
  console.log("Seeding KSP Crime Intelligence Platform demo data...");

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // --- State -----------------------------------------------------------
  const state = await prisma.state.create({ data: { StateName: "Karnataka" } });

  // --- Reference tables --------------------------------------------------
  const caseCategories = await Promise.all(
    ["FIR", "UDR", "PAR", "Zero FIR"].map((name) =>
      prisma.caseCategory.create({ data: { CategoryName: name } })
    )
  );
  const gravityOffences = await Promise.all(
    ["Heinous", "Non-Heinous"].map((name) =>
      prisma.gravityOffence.create({ data: { GravityName: name } })
    )
  );
  const caseStatuses = await Promise.all(
    ["Under Investigation", "Charge Sheeted", "Closed", "Undetected"].map((name) =>
      prisma.caseStatusMaster.create({ data: { StatusName: name } })
    )
  );
  const castes = await Promise.all(
    CASTES.map((name) => prisma.casteMaster.create({ data: { CasteName: name } }))
  );
  const religions = await Promise.all(
    RELIGIONS.map((name) => prisma.religionMaster.create({ data: { ReligionName: name } }))
  );
  const occupations = await Promise.all(
    OCCUPATIONS.map((name) => prisma.occupationMaster.create({ data: { OccupationName: name } }))
  );

  const crimeHeadMap = new Map();
  const subHeadMap = new Map();
  for (const [headName, subHeads] of Object.entries(CRIME_HEADS)) {
    const head = await prisma.crimeHead.create({ data: { CrimeHeadName: headName } });
    crimeHeadMap.set(headName, head);
    for (const subName of subHeads) {
      const sub = await prisma.crimeSubHead.create({
        data: { CrimeHeadID: head.CrimeHeadID, CrimeSubHeadName: subName },
      });
      subHeadMap.set(subName, sub);
    }
  }

  for (const act of ACTS) {
    await prisma.act.create({ data: { ActCode: act.code, ActName: act.name } });
  }
  const sectionMap = new Map();
  for (const s of SECTIONS) {
    const section = await prisma.section.create({
      data: { ActCode: s.actCode, SectionNumber: s.number, SectionDescription: s.description },
    });
    sectionMap.set(`${s.actCode}-${s.number}`, section);
  }
  // Reference mapping: crime head -> its member sub-heads' typical act/sections.
  for (const [headName, subHeads] of Object.entries(CRIME_HEADS)) {
    const head = crimeHeadMap.get(headName);
    const seen = new Set();
    for (const subName of subHeads) {
      for (const ref of SUBHEAD_SECTIONS[subName] ?? []) {
        const key = `${ref.actCode}-${ref.number}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const section = sectionMap.get(key);
        await prisma.crimeHeadActSection.create({
          data: { CrimeHeadID: head.CrimeHeadID, ActCode: ref.actCode, SectionID: section.SectionID },
        });
      }
    }
  }

  // --- Ranks & Designations ------------------------------------------------
  const rankNames = [
    "DGP", "ADGP", "IGP", "DIG", "SP", "Addl. SP", "DySP", "Inspector",
    "Sub-Inspector", "ASI", "Head Constable", "Police Constable",
  ];
  const ranks = await Promise.all(
    rankNames.map((name, i) => prisma.rank.create({ data: { RankName: name, Hierarchy: i + 1 } }))
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
  const designations = await Promise.all(
    designationDefs.map((d) =>
      prisma.designation.create({ data: { DesignationName: d.name, SortOrder: d.order } })
    )
  );
  const designationByName = new Map(designations.map((d) => [d.DesignationName, d]));

  // --- Unit types & units ---------------------------------------------------
  const stateUnitType = await prisma.unitType.create({
    data: { UnitTypeName: "SCRB State HQ", Hierarchy: 1, CityDistState: "State" },
  });
  const districtUnitType = await prisma.unitType.create({
    data: { UnitTypeName: "District SP Office", Hierarchy: 2, CityDistState: "District" },
  });
  const stationUnitType = await prisma.unitType.create({
    data: { UnitTypeName: "Police Station", Hierarchy: 3, CityDistState: "City" },
  });

  const stateHQ = await prisma.unit.create({
    data: {
      UnitName: "SCRB State Headquarters, Bengaluru",
      UnitTypeID: stateUnitType.UnitTypeID,
      StateID: state.StateID,
      Latitude: 12.9716,
      Longitude: 77.5946,
    },
  });

  const districtRecords = [];
  const districtOffices = new Map();
  const stationsByDistrict = new Map();

  for (const d of DISTRICTS) {
    const district = await prisma.district.create({
      data: {
        DistrictName: d.name,
        StateID: state.StateID,
        CentroidLat: d.lat,
        CentroidLng: d.lng,
      },
    });
    districtRecords.push(district);

    const spOffice = await prisma.unit.create({
      data: {
        UnitName: `${d.name} District SP Office`,
        UnitTypeID: districtUnitType.UnitTypeID,
        DistrictID: district.DistrictID,
        StateID: state.StateID,
        Latitude: d.lat,
        Longitude: d.lng,
      },
    });
    districtOffices.set(district.DistrictID, spOffice);

    const stationCount = randInt(2, 4);
    const stations = [];
    for (let i = 0; i < stationCount; i++) {
      const suffix = STATION_SUFFIXES[i % STATION_SUFFIXES.length];
      const station = await prisma.unit.create({
        data: {
          UnitName: `${d.name} ${suffix} Police Station`,
          UnitTypeID: stationUnitType.UnitTypeID,
          DistrictID: district.DistrictID,
          StateID: state.StateID,
          ParentUnitID: spOffice.UnitID,
          Latitude: jitter(d.lat, 0.15),
          Longitude: jitter(d.lng, 0.15),
        },
      });
      stations.push(station);
    }
    stationsByDistrict.set(district.DistrictID, stations);
  }

  // --- Employees --------------------------------------------------------
  const analysts = [];
  const districtSPs = [];
  const stationOfficers = [];
  let kgidCounter = 100001;

  async function createEmployee(opts) {
    const gender = rand() > 0.75 ? "Female" : "Male";
    const employee = await prisma.employee.create({
      data: {
        KGID: `KGID${kgidCounter++}`,
        Name: syntheticName(gender),
        DOB: new Date(1965 + randInt(0, 35), randInt(0, 11), randInt(1, 28)),
        Gender: gender,
        DistrictID: opts.districtId,
        UnitID: opts.unitId,
        RankID: rankByName.get(opts.rank).RankID,
        DesignationID: designationByName.get(opts.designation).DesignationID,
        PasswordHash: passwordHash,
        VictimClearance: opts.victimClearance,
      },
    });
    return employee;
  }

  for (let i = 0; i < 5; i++) {
    const rank = i === 0 ? "ADGP" : "IGP";
    const emp = await createEmployee({
      rank,
      designation: "SCRB Analyst",
      districtId: null,
      unitId: stateHQ.UnitID,
      victimClearance: true,
    });
    analysts.push(emp);
  }

  for (const district of districtRecords) {
    const spOffice = districtOffices.get(district.DistrictID);
    const sp = await createEmployee({
      rank: "SP",
      designation: "District Superintendent",
      districtId: district.DistrictID,
      unitId: spOffice.UnitID,
      victimClearance: true,
    });
    districtSPs.push(sp);

    const stations = stationsByDistrict.get(district.DistrictID);
    for (const station of stations) {
      const sho = await createEmployee({
        rank: "Inspector",
        designation: "Station House Officer",
        districtId: district.DistrictID,
        unitId: station.UnitID,
        victimClearance: false,
      });
      stationOfficers.push(sho);

      const ioCount = randInt(1, 2);
      for (let i = 0; i < ioCount; i++) {
        const io = await createEmployee({
          rank: pick(["Sub-Inspector", "ASI"]),
          designation: "Investigating Officer",
          districtId: district.DistrictID,
          unitId: station.UnitID,
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
  const CASE_COUNT = 420;
  const districtSerial = new Map();
  let caseCounter = 0;

  for (let i = 0; i < CASE_COUNT; i++) {
    const district = pick(districtRecords);
    const stations = stationsByDistrict.get(district.DistrictID);
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
    const stationIOs = stationOfficers.filter((o) => o.UnitID === station.UnitID);
    const io = stationIOs.length > 0 ? pick(stationIOs) : pick(stationOfficers);

    const serial = (districtSerial.get(district.DistrictID) ?? 0) + 1;
    districtSerial.set(district.DistrictID, serial);
    const categoryCode = category.CategoryName === "FIR" ? "1" : category.CategoryName === "Zero FIR" ? "2" : category.CategoryName === "UDR" ? "3" : "4";
    const crimeNo = `${categoryCode}${String(districtIndex).padStart(4, "0")}${String(stationIndex).padStart(4, "0")}${registeredDate.getFullYear()}${String(serial).padStart(5, "0")}`;

    const lat = jitter(station.Latitude ?? district.CentroidLat, 0.03);
    const lng = jitter(station.Longitude ?? district.CentroidLng, 0.03);

    const caseRecord = await prisma.caseMaster.create({
      data: {
        CrimeNo: crimeNo,
        CaseNo: `CR-${registeredDate.getFullYear()}-${String(serial).padStart(4, "0")}`,
        CrimeRegisteredDate: registeredDate,
        PolicePersonID: io.EmployeeID,
        PoliceStationID: station.UnitID,
        CaseCategoryID: category.CaseCategoryID,
        GravityOffenceID: gravity.GravityOffenceID,
        CrimeMajorHeadID: head.CrimeHeadID,
        CrimeMinorHeadID: sub.CrimeSubHeadID,
        CaseStatusID: status.CaseStatusID,
        IncidentFromDate: incidentFrom,
        InfoReceivedPSDate: infoReceived,
        Latitude: lat,
        Longitude: lng,
        BriefFacts: `Synthetic case record: a ${subName.toLowerCase()} incident reported near ${station.UnitName}, under investigation by the local station.`,
      },
    });
    caseCounter++;

    // Complainant
    const complainantGender = rand() > 0.5 ? "Male" : "Female";
    await prisma.complainantDetails.create({
      data: {
        CaseMasterID: caseRecord.CaseMasterID,
        Name: syntheticName(complainantGender),
        Age: randInt(18, 70),
        Gender: complainantGender,
        OccupationID: pick(occupations).OccupationID,
        ReligionID: pick(religions).ReligionID,
        CasteID: pick(castes).CasteID,
      },
    });

    // Victims
    const victimCount = randInt(1, 2);
    const victimIds = [];
    for (let v = 0; v < victimCount; v++) {
      const victimGender = rand() > 0.55 ? "Female" : "Male";
      const victim = await prisma.victim.create({
        data: {
          CaseMasterID: caseRecord.CaseMasterID,
          VictimName: syntheticName(victimGender),
          Age: randInt(5, 75),
          Gender: victimGender,
          VictimPolice: rand() > 0.95,
        },
      });
      victimIds.push(victim.VictimMasterID);
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
      const accused = await prisma.accused.create({
        data: {
          CaseMasterID: caseRecord.CaseMasterID,
          Name: identity.name,
          Age: identity.age,
          Gender: identity.gender,
          PersonID: `A${a + 1}`,
        },
      });
      accusedIds.push(accused.AccusedMasterID);
    }

    // Act/Section association based on the sub-head.
    const refs = SUBHEAD_SECTIONS[subName] ?? [];
    for (const ref of refs) {
      const section = sectionMap.get(`${ref.actCode}-${ref.number}`);
      await prisma.actSectionAssociation.create({
        data: {
          CaseMasterID: caseRecord.CaseMasterID,
          ActCode: ref.actCode,
          SectionID: section.SectionID,
        },
      });
    }

    // Arrest/Surrender events for ~60% of cases with accused.
    if (rand() < 0.6 && accusedIds.length > 0) {
      const eventDate = new Date(registeredDate);
      eventDate.setDate(eventDate.getDate() + randInt(1, 30));
      for (const accusedId of accusedIds) {
        if (rand() < 0.75) {
          await prisma.arrestSurrender.create({
            data: {
              CaseMasterID: caseRecord.CaseMasterID,
              IOID: io.EmployeeID,
              StateID: state.StateID,
              DistrictID: district.DistrictID,
              UnitID: station.UnitID,
              AccusedMasterID: accusedId,
              IsAccused: true,
              IsComplainantAccused: false,
              EventType: rand() > 0.85 ? "Surrender" : "Arrest",
              EventDate: eventDate,
            },
          });
        }
      }
    }

    // Chargesheet for resolved cases.
    if (status.StatusName === "Charge Sheeted" || status.StatusName === "Closed" || status.StatusName === "Undetected") {
      const reportDate = new Date(registeredDate);
      reportDate.setDate(reportDate.getDate() + randInt(30, 120));
      const reportType = status.StatusName === "Undetected" ? "Undetected" : status.StatusName === "Closed" && rand() < 0.2 ? "False Case" : "Chargesheet";
      await prisma.chargesheetDetails.create({
        data: {
          CaseMasterID: caseRecord.CaseMasterID,
          ReportType: reportType,
          ReportDate: reportDate,
          EmployeeID: io.EmployeeID,
        },
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

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
