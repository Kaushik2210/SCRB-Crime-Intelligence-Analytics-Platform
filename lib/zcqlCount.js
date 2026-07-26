/**
 * ZCQL aggregate quirks, in one place:
 *
 *  - `COUNT(*)` is a syntax error — it must be `COUNT(<column>)`, and ROWID is
 *    the one column guaranteed to exist on every Data Store table.
 *  - Column aliases on aggregates are ignored: `SELECT COUNT(ROWID) AS cnt`
 *    still comes back keyed as `COUNT(ROWID)`, so reading `row.cnt` silently
 *    yields undefined.
 */
const COUNT_KEY = "COUNT(ROWID)";

/** Builds a row-count query; pass a WHERE fragment or omit it to count all. */
export function countQuery(tableName, whereClause) {
  const where = whereClause ? ` WHERE ${whereClause}` : "";
  return `SELECT COUNT(ROWID) FROM ${tableName}${where}`;
}

/** Reads the count out of the rows returned for a `countQuery`. */
export function readCount(rows) {
  return Number(rows?.[0]?.[COUNT_KEY] ?? 0);
}
