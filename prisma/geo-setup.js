const { PrismaClient } = require("@prisma/client");

// Applies the PostGIS follow-up from prisma/sql/geo-setup.sql. Kept as discrete
// statements (rather than parsed from the .sql file) because the trigger function
// body contains internal semicolons that a naive statement-splitter would mangle.
//
// PostGIS itself is optional: if the extension can't be created (e.g. the
// PostgreSQL server doesn't have the PostGIS binaries installed), this script
// exits cleanly and lib/geo.js falls back to a JS-based distance clustering
// for hotspot detection instead of ST_ClusterDBSCAN.
const prisma = new PrismaClient();

const geoStatements = [
  `ALTER TABLE case_master ADD COLUMN IF NOT EXISTS geog geography(Point, 4326)`,
  `UPDATE case_master
   SET geog = ST_SetSRID(ST_MakePoint("Longitude", "Latitude"), 4326)::geography
   WHERE geog IS NULL`,
  `CREATE INDEX IF NOT EXISTS case_master_geog_gist ON case_master USING GIST (geog)`,
  `CREATE OR REPLACE FUNCTION case_master_set_geog() RETURNS trigger AS $$
   BEGIN
     NEW.geog = ST_SetSRID(ST_MakePoint(NEW."Longitude", NEW."Latitude"), 4326)::geography;
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql`,
  `DROP TRIGGER IF EXISTS trg_case_master_set_geog ON case_master`,
  `CREATE TRIGGER trg_case_master_set_geog
   BEFORE INSERT OR UPDATE OF "Latitude", "Longitude" ON case_master
   FOR EACH ROW EXECUTE FUNCTION case_master_set_geog()`,
];

async function main() {
  try {
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS postgis`);
  } catch (err) {
    console.warn(
      "PostGIS extension is not available on this PostgreSQL server — skipping geography column setup.\n" +
        "Hotspot detection will use the JS-based distance-clustering fallback in lib/geo.js instead of ST_ClusterDBSCAN.\n" +
        `(${err.message})`
    );
    return;
  }

  for (const statement of geoStatements) {
    await prisma.$executeRawUnsafe(statement);
  }
  console.log(`PostGIS extension enabled. Applied ${geoStatements.length} geography setup statements to case_master.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
