import { getZCQL } from "@/lib/catalystContext";

/**
 * Catalyst's own docs describe `executeZCQLQuery`'s result only as "an array
 * of row objects" without pinning down whether each row is flat or nested
 * under its source table name (a shape Catalyst's ZCQL has used historically
 * on other SDKs). Rather than guess, normalize defensively: unwrap a
 * `{ [tableName]: {...} }` row if present, otherwise use the row as-is.
 *
 * If neither shape matches what your Catalyst project actually returns,
 * this throws instead of silently returning wrong data — log one raw row
 * from `executeZCQLQuery` in your project and adjust this function once.
 */
function normalizeRow(row, tableName) {
  if (row && typeof row === "object" && tableName in row) {
    return row[tableName];
  }
  if (row && typeof row === "object") {
    return row;
  }
  throw new Error(`Unexpected ZCQL row shape for table "${tableName}": ${JSON.stringify(row)}`);
}

/** Runs a ZCQL query and returns normalized row objects for `tableName`. */
export async function zcqlQuery(query, tableName) {
  const result = await getZCQL().executeZCQLQuery(query);
  return result.map((row) => normalizeRow(row, tableName));
}
