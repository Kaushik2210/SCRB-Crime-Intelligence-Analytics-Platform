/**
 * Catalyst Data Store schema, transcribed from the Police FIR ER diagram
 * (docs/Police_FIR_ER_Diagram.pdf — Karnataka Police Department).
 *
 * Catalyst auto-generates ROWID as every table's primary key and does not allow
 * a custom auto-increment PK, so each entity's own surrogate key from the ER
 * diagram (CaseMasterID, VictimMasterID, …) is NOT declared as a stored column —
 * ROWID plays that role and read queries alias it back (`SELECT ROWID AS
 * CaseMasterID ...`, see lib/network.js). Foreign-key columns therefore hold the
 * parent row's ROWID and are declared `bigint`; they are plain data columns
 * joined in app code, matching the existing lib/zcql.js conventions.
 *
 * This file is the single source of truth for the schema. It is consumed by
 * scripts/applyDatastoreSchema.md's browser snippet, which creates any missing
 * tables/columns in the Catalyst Console idempotently.
 */

const V = (n) => ({ data_type: "varchar", max_length: String(n || 255) });
const T = () => ({ data_type: "text", max_length: "10000" });
const BI = () => ({ data_type: "bigint", max_length: "19" });
const DB = () => ({ data_type: "double", max_length: "17" });
const BO = () => ({ data_type: "boolean", max_length: "50" });
const D = () => ({ data_type: "date", max_length: "50" });
const DT = () => ({ data_type: "datetime", max_length: "50" });

/** [tableName, [ [columnName, typeSpec, { u: isUnique }?], ... ] ] */
export const SCHEMA = [
  ["State", [["StateName", V()], ["NationalityID", BI()], ["Active", BO()]]],
  ["District", [["DistrictName", V()], ["StateID", BI()], ["Active", BO()]]],
  ["UnitType", [["UnitTypeName", V()], ["CityDistState", V()], ["Hierarchy", BI()], ["Active", BO()]]],
  ["Unit", [
    ["UnitName", V()], ["TypeID", BI()], ["ParentUnit", BI()], ["NationalityID", BI()],
    ["StateID", BI()], ["DistrictID", BI()], ["Active", BO()],
  ]],
  ["Rank", [["RankName", V()], ["Hierarchy", BI()], ["Active", BO()]]],
  ["Designation", [["DesignationName", V()], ["Active", BO()], ["SortOrder", BI()]]],
  ["Employee", [
    ["DistrictID", BI()], ["UnitID", BI()], ["RankID", BI()], ["DesignationID", BI()],
    ["KGID", V(), { u: true }], ["FirstName", V()], ["EmployeeDOB", D()], ["GenderID", BI()],
    ["BloodGroupID", BI()], ["PhysicallyChallenged", BO()], ["AppointmentDate", D()],
  ]],
  ["Court", [["CourtName", V()], ["DistrictID", BI()], ["StateID", BI()], ["Active", BO()]]],
  ["CaseCategory", [["LookupValue", V()]]],
  ["GravityOffence", [["LookupValue", V()]]],
  ["CaseStatusMaster", [["CaseStatusName", V()]]],
  ["CasteMaster", [["caste_master_name", V()]]],
  ["ReligionMaster", [["ReligionName", V()]]],
  ["OccupationMaster", [["OccupationName", V()]]],
  ["CrimeHead", [["CrimeGroupName", V()], ["Active", BO()]]],
  ["CrimeSubHead", [["CrimeHeadID", BI()], ["CrimeHeadName", V()], ["SeqID", BI()]]],
  ["Act", [["ActCode", V(50), { u: true }], ["ActDescription", V()], ["ShortName", V()], ["Active", BO()]]],
  ["Section", [["ActCode", V(50)], ["SectionCode", V(50)], ["SectionDescription", V()], ["Active", BO()]]],
  ["CrimeHeadActSection", [["CrimeHeadID", BI()], ["ActCode", V(50)], ["SectionCode", V(50)]]],
  ["CaseMaster", [
    ["CrimeNo", V(50), { u: true }], ["CaseNo", V(50)], ["CrimeRegisteredDate", D()],
    ["PolicePersonID", BI()], ["PoliceStationID", BI()], ["CaseCategoryID", BI()],
    ["GravityOffenceID", BI()], ["CrimeMajorHeadID", BI()], ["CrimeMinorHeadID", BI()],
    ["CaseStatusID", BI()], ["CourtID", BI()],
    // The ER diagram lists the occurrence time/location fields directly on
    // CaseMaster, and separately names a 1:1 Inv_OccuranceTime table in the
    // relationship matrix — both are created, matching the document.
    ["IncidentFromDate", DT()], ["IncidentToDate", DT()], ["InfoReceivedPSDate", DT()],
    ["latitude", DB()], ["longitude", DB()], ["BriefFacts", T()],
  ]],
  ["Inv_OccuranceTime", [
    ["CaseMasterID", BI()], ["IncidentFromDate", DT()], ["IncidentToDate", DT()],
    ["InfoReceivedPSDate", DT()], ["latitude", DB()], ["longitude", DB()], ["BriefFacts", T()],
  ]],
  ["ComplainantDetails", [
    ["CaseMasterID", BI()], ["ComplainantName", V()], ["AgeYear", BI()],
    ["OccupationID", BI()], ["ReligionID", BI()], ["CasteID", BI()], ["GenderID", BI()],
  ]],
  ["ActSectionAssociation", [
    ["CaseMasterID", BI()], ["ActID", V(50)], ["SectionID", V(50)],
    ["ActOrderID", BI()], ["SectionOrderID", BI()],
  ]],
  ["Victim", [
    ["CaseMasterID", BI()], ["VictimName", V()], ["AgeYear", BI()],
    ["GenderID", BI()], ["VictimPolice", V(5)],
  ]],
  ["Accused", [
    ["CaseMasterID", BI()], ["AccusedName", V()], ["AgeYear", BI()],
    ["GenderID", BI()], ["PersonID", V(20)],
  ]],
  ["ArrestSurrender", [
    ["CaseMasterID", BI()], ["ArrestSurrenderTypeID", BI()], ["ArrestSurrenderDate", D()],
    ["ArrestSurrenderStateId", BI()], ["ArrestSurrenderDistrictId", BI()],
    ["PoliceStationID", BI()], ["IOID", BI()], ["CourtID", BI()], ["AccusedMasterID", BI()],
    ["IsAccused", BO()], ["IsComplainantAccused", BO()],
  ]],
  ["inv_arrestsurrenderaccused", [["ArrestSurrenderID", BI()], ["AccusedMasterID", BI()]]],
  ["ChargesheetDetails", [
    ["CaseMasterID", BI()], ["csdate", DT()], ["cstype", V(5)], ["PolicePersonID", BI()],
  ]],
];
