-- CreateTable
CREATE TABLE "state" (
    "StateID" SERIAL NOT NULL,
    "StateName" TEXT NOT NULL,

    CONSTRAINT "state_pkey" PRIMARY KEY ("StateID")
);

-- CreateTable
CREATE TABLE "district" (
    "DistrictID" SERIAL NOT NULL,
    "DistrictName" TEXT NOT NULL,
    "StateID" INTEGER NOT NULL,
    "CentroidLat" DOUBLE PRECISION NOT NULL,
    "CentroidLng" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "district_pkey" PRIMARY KEY ("DistrictID")
);

-- CreateTable
CREATE TABLE "unit_type" (
    "UnitTypeID" SERIAL NOT NULL,
    "UnitTypeName" TEXT NOT NULL,
    "Hierarchy" INTEGER NOT NULL,
    "CityDistState" TEXT NOT NULL,

    CONSTRAINT "unit_type_pkey" PRIMARY KEY ("UnitTypeID")
);

-- CreateTable
CREATE TABLE "unit" (
    "UnitID" SERIAL NOT NULL,
    "UnitName" TEXT NOT NULL,
    "UnitTypeID" INTEGER NOT NULL,
    "DistrictID" INTEGER,
    "StateID" INTEGER NOT NULL,
    "ParentUnitID" INTEGER,
    "Latitude" DOUBLE PRECISION,
    "Longitude" DOUBLE PRECISION,

    CONSTRAINT "unit_pkey" PRIMARY KEY ("UnitID")
);

-- CreateTable
CREATE TABLE "rank" (
    "RankID" SERIAL NOT NULL,
    "RankName" TEXT NOT NULL,
    "Hierarchy" INTEGER NOT NULL,

    CONSTRAINT "rank_pkey" PRIMARY KEY ("RankID")
);

-- CreateTable
CREATE TABLE "designation" (
    "DesignationID" SERIAL NOT NULL,
    "DesignationName" TEXT NOT NULL,
    "SortOrder" INTEGER NOT NULL,

    CONSTRAINT "designation_pkey" PRIMARY KEY ("DesignationID")
);

-- CreateTable
CREATE TABLE "employee" (
    "EmployeeID" SERIAL NOT NULL,
    "KGID" TEXT NOT NULL,
    "Name" TEXT NOT NULL,
    "DOB" TIMESTAMP(3) NOT NULL,
    "Gender" TEXT NOT NULL,
    "DistrictID" INTEGER,
    "UnitID" INTEGER,
    "RankID" INTEGER NOT NULL,
    "DesignationID" INTEGER NOT NULL,
    "PasswordHash" TEXT NOT NULL,
    "VictimClearance" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "employee_pkey" PRIMARY KEY ("EmployeeID")
);

-- CreateTable
CREATE TABLE "court" (
    "CourtID" SERIAL NOT NULL,
    "CourtName" TEXT NOT NULL,
    "DistrictID" INTEGER NOT NULL,
    "StateID" INTEGER NOT NULL,

    CONSTRAINT "court_pkey" PRIMARY KEY ("CourtID")
);

-- CreateTable
CREATE TABLE "case_category" (
    "CaseCategoryID" SERIAL NOT NULL,
    "CategoryName" TEXT NOT NULL,

    CONSTRAINT "case_category_pkey" PRIMARY KEY ("CaseCategoryID")
);

-- CreateTable
CREATE TABLE "gravity_offence" (
    "GravityOffenceID" SERIAL NOT NULL,
    "GravityName" TEXT NOT NULL,

    CONSTRAINT "gravity_offence_pkey" PRIMARY KEY ("GravityOffenceID")
);

-- CreateTable
CREATE TABLE "case_status_master" (
    "CaseStatusID" SERIAL NOT NULL,
    "StatusName" TEXT NOT NULL,

    CONSTRAINT "case_status_master_pkey" PRIMARY KEY ("CaseStatusID")
);

-- CreateTable
CREATE TABLE "crime_head" (
    "CrimeHeadID" SERIAL NOT NULL,
    "CrimeHeadName" TEXT NOT NULL,

    CONSTRAINT "crime_head_pkey" PRIMARY KEY ("CrimeHeadID")
);

-- CreateTable
CREATE TABLE "crime_sub_head" (
    "CrimeSubHeadID" SERIAL NOT NULL,
    "CrimeHeadID" INTEGER NOT NULL,
    "CrimeSubHeadName" TEXT NOT NULL,

    CONSTRAINT "crime_sub_head_pkey" PRIMARY KEY ("CrimeSubHeadID")
);

-- CreateTable
CREATE TABLE "act" (
    "ActCode" TEXT NOT NULL,
    "ActName" TEXT NOT NULL,

    CONSTRAINT "act_pkey" PRIMARY KEY ("ActCode")
);

-- CreateTable
CREATE TABLE "section" (
    "SectionID" SERIAL NOT NULL,
    "ActCode" TEXT NOT NULL,
    "SectionNumber" TEXT NOT NULL,
    "SectionDescription" TEXT NOT NULL,

    CONSTRAINT "section_pkey" PRIMARY KEY ("SectionID")
);

-- CreateTable
CREATE TABLE "crime_head_act_section" (
    "CrimeHeadActSectionID" SERIAL NOT NULL,
    "CrimeHeadID" INTEGER NOT NULL,
    "ActCode" TEXT NOT NULL,
    "SectionID" INTEGER NOT NULL,

    CONSTRAINT "crime_head_act_section_pkey" PRIMARY KEY ("CrimeHeadActSectionID")
);

-- CreateTable
CREATE TABLE "caste_master" (
    "CasteID" SERIAL NOT NULL,
    "CasteName" TEXT NOT NULL,

    CONSTRAINT "caste_master_pkey" PRIMARY KEY ("CasteID")
);

-- CreateTable
CREATE TABLE "religion_master" (
    "ReligionID" SERIAL NOT NULL,
    "ReligionName" TEXT NOT NULL,

    CONSTRAINT "religion_master_pkey" PRIMARY KEY ("ReligionID")
);

-- CreateTable
CREATE TABLE "occupation_master" (
    "OccupationID" SERIAL NOT NULL,
    "OccupationName" TEXT NOT NULL,

    CONSTRAINT "occupation_master_pkey" PRIMARY KEY ("OccupationID")
);

-- CreateTable
CREATE TABLE "case_master" (
    "CaseMasterID" SERIAL NOT NULL,
    "CrimeNo" TEXT NOT NULL,
    "CaseNo" TEXT NOT NULL,
    "CrimeRegisteredDate" TIMESTAMP(3) NOT NULL,
    "PolicePersonID" INTEGER NOT NULL,
    "PoliceStationID" INTEGER NOT NULL,
    "CaseCategoryID" INTEGER NOT NULL,
    "GravityOffenceID" INTEGER NOT NULL,
    "CrimeMajorHeadID" INTEGER NOT NULL,
    "CrimeMinorHeadID" INTEGER NOT NULL,
    "CaseStatusID" INTEGER NOT NULL,
    "CourtID" INTEGER,
    "IncidentFromDate" TIMESTAMP(3) NOT NULL,
    "IncidentToDate" TIMESTAMP(3),
    "InfoReceivedPSDate" TIMESTAMP(3) NOT NULL,
    "Latitude" DOUBLE PRECISION NOT NULL,
    "Longitude" DOUBLE PRECISION NOT NULL,
    "BriefFacts" TEXT NOT NULL,

    CONSTRAINT "case_master_pkey" PRIMARY KEY ("CaseMasterID")
);

-- CreateTable
CREATE TABLE "complainant_details" (
    "ComplainantID" SERIAL NOT NULL,
    "CaseMasterID" INTEGER NOT NULL,
    "Name" TEXT NOT NULL,
    "Age" INTEGER NOT NULL,
    "OccupationID" INTEGER,
    "ReligionID" INTEGER,
    "CasteID" INTEGER,
    "Gender" TEXT NOT NULL,

    CONSTRAINT "complainant_details_pkey" PRIMARY KEY ("ComplainantID")
);

-- CreateTable
CREATE TABLE "victim" (
    "VictimMasterID" SERIAL NOT NULL,
    "CaseMasterID" INTEGER NOT NULL,
    "VictimName" TEXT NOT NULL,
    "Age" INTEGER NOT NULL,
    "Gender" TEXT NOT NULL,
    "VictimPolice" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "victim_pkey" PRIMARY KEY ("VictimMasterID")
);

-- CreateTable
CREATE TABLE "accused" (
    "AccusedMasterID" SERIAL NOT NULL,
    "CaseMasterID" INTEGER NOT NULL,
    "Name" TEXT NOT NULL,
    "Age" INTEGER NOT NULL,
    "Gender" TEXT NOT NULL,
    "PersonID" TEXT NOT NULL,

    CONSTRAINT "accused_pkey" PRIMARY KEY ("AccusedMasterID")
);

-- CreateTable
CREATE TABLE "arrest_surrender" (
    "ArrestSurrenderID" SERIAL NOT NULL,
    "CaseMasterID" INTEGER NOT NULL,
    "IOID" INTEGER NOT NULL,
    "StateID" INTEGER NOT NULL,
    "DistrictID" INTEGER NOT NULL,
    "UnitID" INTEGER NOT NULL,
    "CourtID" INTEGER,
    "AccusedMasterID" INTEGER,
    "VictimMasterID" INTEGER,
    "IsAccused" BOOLEAN NOT NULL DEFAULT true,
    "IsComplainantAccused" BOOLEAN NOT NULL DEFAULT false,
    "EventType" TEXT NOT NULL,
    "EventDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "arrest_surrender_pkey" PRIMARY KEY ("ArrestSurrenderID")
);

-- CreateTable
CREATE TABLE "act_section_association" (
    "ActSectionAssociationID" SERIAL NOT NULL,
    "CaseMasterID" INTEGER NOT NULL,
    "ActCode" TEXT NOT NULL,
    "SectionID" INTEGER NOT NULL,

    CONSTRAINT "act_section_association_pkey" PRIMARY KEY ("ActSectionAssociationID")
);

-- CreateTable
CREATE TABLE "chargesheet_details" (
    "ChargesheetID" SERIAL NOT NULL,
    "CaseMasterID" INTEGER NOT NULL,
    "ReportType" TEXT NOT NULL,
    "ReportDate" TIMESTAMP(3) NOT NULL,
    "EmployeeID" INTEGER NOT NULL,

    CONSTRAINT "chargesheet_details_pkey" PRIMARY KEY ("ChargesheetID")
);

-- CreateTable
CREATE TABLE "access_log" (
    "AccessLogID" SERIAL NOT NULL,
    "UserID" INTEGER NOT NULL,
    "Entity" TEXT NOT NULL,
    "RecordID" INTEGER NOT NULL,
    "Action" TEXT NOT NULL,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_log_pkey" PRIMARY KEY ("AccessLogID")
);

-- CreateIndex
CREATE UNIQUE INDEX "state_StateName_key" ON "state"("StateName");

-- CreateIndex
CREATE UNIQUE INDEX "district_DistrictName_StateID_key" ON "district"("DistrictName", "StateID");

-- CreateIndex
CREATE UNIQUE INDEX "rank_RankName_key" ON "rank"("RankName");

-- CreateIndex
CREATE UNIQUE INDEX "designation_DesignationName_key" ON "designation"("DesignationName");

-- CreateIndex
CREATE UNIQUE INDEX "employee_KGID_key" ON "employee"("KGID");

-- CreateIndex
CREATE UNIQUE INDEX "case_category_CategoryName_key" ON "case_category"("CategoryName");

-- CreateIndex
CREATE UNIQUE INDEX "gravity_offence_GravityName_key" ON "gravity_offence"("GravityName");

-- CreateIndex
CREATE UNIQUE INDEX "case_status_master_StatusName_key" ON "case_status_master"("StatusName");

-- CreateIndex
CREATE UNIQUE INDEX "crime_head_CrimeHeadName_key" ON "crime_head"("CrimeHeadName");

-- CreateIndex
CREATE UNIQUE INDEX "crime_sub_head_CrimeHeadID_CrimeSubHeadName_key" ON "crime_sub_head"("CrimeHeadID", "CrimeSubHeadName");

-- CreateIndex
CREATE UNIQUE INDEX "section_ActCode_SectionNumber_key" ON "section"("ActCode", "SectionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "crime_head_act_section_CrimeHeadID_ActCode_SectionID_key" ON "crime_head_act_section"("CrimeHeadID", "ActCode", "SectionID");

-- CreateIndex
CREATE UNIQUE INDEX "caste_master_CasteName_key" ON "caste_master"("CasteName");

-- CreateIndex
CREATE UNIQUE INDEX "religion_master_ReligionName_key" ON "religion_master"("ReligionName");

-- CreateIndex
CREATE UNIQUE INDEX "occupation_master_OccupationName_key" ON "occupation_master"("OccupationName");

-- CreateIndex
CREATE UNIQUE INDEX "case_master_CrimeNo_key" ON "case_master"("CrimeNo");

-- CreateIndex
CREATE INDEX "case_master_PoliceStationID_idx" ON "case_master"("PoliceStationID");

-- CreateIndex
CREATE INDEX "case_master_CrimeRegisteredDate_idx" ON "case_master"("CrimeRegisteredDate");

-- CreateIndex
CREATE INDEX "case_master_CrimeMinorHeadID_idx" ON "case_master"("CrimeMinorHeadID");

-- CreateIndex
CREATE INDEX "complainant_details_CaseMasterID_idx" ON "complainant_details"("CaseMasterID");

-- CreateIndex
CREATE INDEX "victim_CaseMasterID_idx" ON "victim"("CaseMasterID");

-- CreateIndex
CREATE INDEX "accused_CaseMasterID_idx" ON "accused"("CaseMasterID");

-- CreateIndex
CREATE INDEX "accused_Name_idx" ON "accused"("Name");

-- CreateIndex
CREATE INDEX "arrest_surrender_CaseMasterID_idx" ON "arrest_surrender"("CaseMasterID");

-- CreateIndex
CREATE INDEX "arrest_surrender_AccusedMasterID_idx" ON "arrest_surrender"("AccusedMasterID");

-- CreateIndex
CREATE INDEX "act_section_association_CaseMasterID_idx" ON "act_section_association"("CaseMasterID");

-- CreateIndex
CREATE INDEX "chargesheet_details_CaseMasterID_idx" ON "chargesheet_details"("CaseMasterID");

-- CreateIndex
CREATE INDEX "access_log_UserID_idx" ON "access_log"("UserID");

-- CreateIndex
CREATE INDEX "access_log_Entity_RecordID_idx" ON "access_log"("Entity", "RecordID");

-- AddForeignKey
ALTER TABLE "district" ADD CONSTRAINT "district_StateID_fkey" FOREIGN KEY ("StateID") REFERENCES "state"("StateID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit" ADD CONSTRAINT "unit_UnitTypeID_fkey" FOREIGN KEY ("UnitTypeID") REFERENCES "unit_type"("UnitTypeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit" ADD CONSTRAINT "unit_DistrictID_fkey" FOREIGN KEY ("DistrictID") REFERENCES "district"("DistrictID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit" ADD CONSTRAINT "unit_StateID_fkey" FOREIGN KEY ("StateID") REFERENCES "state"("StateID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit" ADD CONSTRAINT "unit_ParentUnitID_fkey" FOREIGN KEY ("ParentUnitID") REFERENCES "unit"("UnitID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_DistrictID_fkey" FOREIGN KEY ("DistrictID") REFERENCES "district"("DistrictID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_UnitID_fkey" FOREIGN KEY ("UnitID") REFERENCES "unit"("UnitID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_RankID_fkey" FOREIGN KEY ("RankID") REFERENCES "rank"("RankID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_DesignationID_fkey" FOREIGN KEY ("DesignationID") REFERENCES "designation"("DesignationID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "court" ADD CONSTRAINT "court_DistrictID_fkey" FOREIGN KEY ("DistrictID") REFERENCES "district"("DistrictID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "court" ADD CONSTRAINT "court_StateID_fkey" FOREIGN KEY ("StateID") REFERENCES "state"("StateID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crime_sub_head" ADD CONSTRAINT "crime_sub_head_CrimeHeadID_fkey" FOREIGN KEY ("CrimeHeadID") REFERENCES "crime_head"("CrimeHeadID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "section" ADD CONSTRAINT "section_ActCode_fkey" FOREIGN KEY ("ActCode") REFERENCES "act"("ActCode") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crime_head_act_section" ADD CONSTRAINT "crime_head_act_section_CrimeHeadID_fkey" FOREIGN KEY ("CrimeHeadID") REFERENCES "crime_head"("CrimeHeadID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crime_head_act_section" ADD CONSTRAINT "crime_head_act_section_ActCode_fkey" FOREIGN KEY ("ActCode") REFERENCES "act"("ActCode") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crime_head_act_section" ADD CONSTRAINT "crime_head_act_section_SectionID_fkey" FOREIGN KEY ("SectionID") REFERENCES "section"("SectionID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_master" ADD CONSTRAINT "case_master_PolicePersonID_fkey" FOREIGN KEY ("PolicePersonID") REFERENCES "employee"("EmployeeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_master" ADD CONSTRAINT "case_master_PoliceStationID_fkey" FOREIGN KEY ("PoliceStationID") REFERENCES "unit"("UnitID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_master" ADD CONSTRAINT "case_master_CaseCategoryID_fkey" FOREIGN KEY ("CaseCategoryID") REFERENCES "case_category"("CaseCategoryID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_master" ADD CONSTRAINT "case_master_GravityOffenceID_fkey" FOREIGN KEY ("GravityOffenceID") REFERENCES "gravity_offence"("GravityOffenceID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_master" ADD CONSTRAINT "case_master_CrimeMajorHeadID_fkey" FOREIGN KEY ("CrimeMajorHeadID") REFERENCES "crime_head"("CrimeHeadID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_master" ADD CONSTRAINT "case_master_CrimeMinorHeadID_fkey" FOREIGN KEY ("CrimeMinorHeadID") REFERENCES "crime_sub_head"("CrimeSubHeadID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_master" ADD CONSTRAINT "case_master_CaseStatusID_fkey" FOREIGN KEY ("CaseStatusID") REFERENCES "case_status_master"("CaseStatusID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_master" ADD CONSTRAINT "case_master_CourtID_fkey" FOREIGN KEY ("CourtID") REFERENCES "court"("CourtID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complainant_details" ADD CONSTRAINT "complainant_details_CaseMasterID_fkey" FOREIGN KEY ("CaseMasterID") REFERENCES "case_master"("CaseMasterID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complainant_details" ADD CONSTRAINT "complainant_details_OccupationID_fkey" FOREIGN KEY ("OccupationID") REFERENCES "occupation_master"("OccupationID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complainant_details" ADD CONSTRAINT "complainant_details_ReligionID_fkey" FOREIGN KEY ("ReligionID") REFERENCES "religion_master"("ReligionID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complainant_details" ADD CONSTRAINT "complainant_details_CasteID_fkey" FOREIGN KEY ("CasteID") REFERENCES "caste_master"("CasteID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "victim" ADD CONSTRAINT "victim_CaseMasterID_fkey" FOREIGN KEY ("CaseMasterID") REFERENCES "case_master"("CaseMasterID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accused" ADD CONSTRAINT "accused_CaseMasterID_fkey" FOREIGN KEY ("CaseMasterID") REFERENCES "case_master"("CaseMasterID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arrest_surrender" ADD CONSTRAINT "arrest_surrender_CaseMasterID_fkey" FOREIGN KEY ("CaseMasterID") REFERENCES "case_master"("CaseMasterID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arrest_surrender" ADD CONSTRAINT "arrest_surrender_IOID_fkey" FOREIGN KEY ("IOID") REFERENCES "employee"("EmployeeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arrest_surrender" ADD CONSTRAINT "arrest_surrender_StateID_fkey" FOREIGN KEY ("StateID") REFERENCES "state"("StateID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arrest_surrender" ADD CONSTRAINT "arrest_surrender_DistrictID_fkey" FOREIGN KEY ("DistrictID") REFERENCES "district"("DistrictID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arrest_surrender" ADD CONSTRAINT "arrest_surrender_UnitID_fkey" FOREIGN KEY ("UnitID") REFERENCES "unit"("UnitID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arrest_surrender" ADD CONSTRAINT "arrest_surrender_CourtID_fkey" FOREIGN KEY ("CourtID") REFERENCES "court"("CourtID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arrest_surrender" ADD CONSTRAINT "arrest_surrender_AccusedMasterID_fkey" FOREIGN KEY ("AccusedMasterID") REFERENCES "accused"("AccusedMasterID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arrest_surrender" ADD CONSTRAINT "arrest_surrender_VictimMasterID_fkey" FOREIGN KEY ("VictimMasterID") REFERENCES "victim"("VictimMasterID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_section_association" ADD CONSTRAINT "act_section_association_CaseMasterID_fkey" FOREIGN KEY ("CaseMasterID") REFERENCES "case_master"("CaseMasterID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_section_association" ADD CONSTRAINT "act_section_association_ActCode_fkey" FOREIGN KEY ("ActCode") REFERENCES "act"("ActCode") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "act_section_association" ADD CONSTRAINT "act_section_association_SectionID_fkey" FOREIGN KEY ("SectionID") REFERENCES "section"("SectionID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chargesheet_details" ADD CONSTRAINT "chargesheet_details_CaseMasterID_fkey" FOREIGN KEY ("CaseMasterID") REFERENCES "case_master"("CaseMasterID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chargesheet_details" ADD CONSTRAINT "chargesheet_details_EmployeeID_fkey" FOREIGN KEY ("EmployeeID") REFERENCES "employee"("EmployeeID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_log" ADD CONSTRAINT "access_log_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "employee"("EmployeeID") ON DELETE RESTRICT ON UPDATE CASCADE;
