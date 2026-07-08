-- Adds a real PostGIS geography column derived from CaseMaster's Latitude/Longitude,
-- keeps it in sync via trigger, and indexes it for spatial queries (ST_DWithin,
-- ST_ClusterKMeans, ST_ClusterDBSCAN) used by the hotspot/heatmap features.
-- Run after `prisma migrate dev` via `npm run db:geo-setup` (Prisma's declarative
-- schema can't express a generated geography column directly, so this is applied
-- as a follow-up raw-SQL step).

ALTER TABLE case_master ADD COLUMN IF NOT EXISTS geog geography(Point, 4326);

UPDATE case_master
SET geog = ST_SetSRID(ST_MakePoint("Longitude", "Latitude"), 4326)::geography
WHERE geog IS NULL;

CREATE INDEX IF NOT EXISTS case_master_geog_gist ON case_master USING GIST (geog);

CREATE OR REPLACE FUNCTION case_master_set_geog() RETURNS trigger AS $$
BEGIN
  NEW.geog = ST_SetSRID(ST_MakePoint(NEW."Longitude", NEW."Latitude"), 4326)::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_case_master_set_geog ON case_master;
CREATE TRIGGER trg_case_master_set_geog
BEFORE INSERT OR UPDATE OF "Latitude", "Longitude" ON case_master
FOR EACH ROW EXECUTE FUNCTION case_master_set_geog();
