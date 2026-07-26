import { getCatalystApp, getZCQL } from "@/lib/catalystContext";
import { isDemoMode, demoQuery, demoTable } from "@/lib/demoData";

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

/**
 * ZCQL accepts `AS` in a SELECT list but *ignores it* — `SELECT ROWID AS
 * EmployeeID` still comes back keyed `ROWID`, and `SELECT COUNT(ROWID) AS cnt`
 * comes back keyed `COUNT(ROWID)`. Reading the alias therefore silently yields
 * `undefined` rather than failing loudly.
 *
 * Since the app leans on aliases heavily — both to expose ROWID as a
 * domain-specific id (`ROWID AS CaseMasterID`) and to map ER-diagram column
 * names onto the names components consume (`cstype AS ReportType`) — the
 * aliasing is applied here, once, instead of at every call site.
 *
 * Returns a Map of actual-result-key -> alias, or null when there's nothing to
 * rename.
 */
function parseAliases(query) {
  const selectList = /^\s*SELECT\s+([\s\S]+?)\s+FROM\s/i.exec(query)?.[1];
  if (!selectList) return null;

  // Split on top-level commas only, so COUNT(a, b)-style expressions survive.
  const parts = [];
  let depth = 0;
  let current = "";
  for (const char of selectList) {
    if (char === "(") depth++;
    else if (char === ")") depth--;
    if (char === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  parts.push(current);

  const aliases = new Map();
  for (const part of parts) {
    const match = /^\s*(.+?)\s+AS\s+([A-Za-z_]\w*)\s*$/i.exec(part);
    if (!match) continue;
    let source = match[1].trim();
    const alias = match[2].trim();
    // A table-qualified column (`Employee.ROWID`) comes back keyed by the bare
    // column name, so compare on that.
    if (!source.includes("(")) source = source.slice(source.lastIndexOf(".") + 1);
    if (source !== alias) aliases.set(source, alias);
  }
  return aliases.size > 0 ? aliases : null;
}

function applyAliases(row, aliases) {
  if (!aliases) return row;
  const out = { ...row };
  for (const [source, alias] of aliases) {
    if (source in out) {
      out[alias] = out[source];
      // Keep the original key too — some callers read the raw column name.
    }
  }
  return out;
}

/**
 * ZCQL returns at most 300 rows and rejects `LIMIT` above that. Critically, a
 * query with no LIMIT is *silently* truncated at 300 rather than erroring — so
 * every "fetch the scoped set and aggregate in JS" call in lib/* would quietly
 * under-report once a table passes 300 rows.
 *
 * Queries that don't set their own LIMIT are therefore paged through here and
 * concatenated. An explicit LIMIT is left alone: the caller asked for a capped
 * result (e.g. the alerts feed's LIMIT 40).
 */
const ZCQL_MAX_ROWS = 300;

async function executePaged(query) {
  const zcql = getZCQL();

  // Aggregates collapse to a single row — paging them is meaningless, and
  // appending ORDER BY would be invalid.
  const isAggregate = /\b(COUNT|SUM|AVG|MIN|MAX)\s*\(/i.test(query.split(/\bFROM\b/i)[0] ?? "");
  if (isAggregate) return zcql.executeZCQLQuery(query);

  // An `offset,count` LIMIT is the caller paging deliberately — leave it be.
  const limitMatch = /\bLIMIT\s+(\d+)\s*(?:,\s*(\d+))?\s*$/i.exec(query.trim());
  if (limitMatch?.[2] !== undefined) return zcql.executeZCQLQuery(query);

  const requested = limitMatch ? Number(limitMatch[1]) : Infinity;
  if (requested <= ZCQL_MAX_ROWS) return zcql.executeZCQLQuery(query);

  // Either no LIMIT (fetch everything) or a LIMIT above ZCQL's ceiling — page.
  const base = limitMatch ? query.trim().slice(0, limitMatch.index).trim() : query;
  // Stable ordering, so page boundaries can't drop or repeat rows.
  const ordered = /\bORDER\s+BY\b/i.test(base) ? base : `${base} ORDER BY ROWID`;

  // ZCQL's `LIMIT <start>,<count>` start is 1-BASED (`LIMIT 0,3` and
  // `LIMIT 1,3` both return the first three rows), so pages advance from 1 —
  // starting at 0 would re-fetch the row on each page boundary.
  const all = [];
  let start = 1;
  while (all.length < requested) {
    const pageSize = Math.min(ZCQL_MAX_ROWS, requested - all.length);
    const page = await zcql.executeZCQLQuery(`${ordered} LIMIT ${start},${pageSize}`);
    all.push(...page);
    if (page.length < pageSize) break;
    start += pageSize;
  }
  return all;
}

/** Runs a ZCQL query and returns normalized row objects for `tableName`. */
export async function zcqlQuery(query, tableName) {
  if (isDemoMode()) return demoQuery(query, tableName);
  const result = await executePaged(query);
  const aliases = parseAliases(query);
  return result.map((row) => applyAliases(normalizeRow(row, tableName), aliases));
}

/**
 * The Data Store rejects bulk writes above 200 rows ("Only 200 rows can be
 * updated at once"), which is easy to trip accidentally — the victim-access
 * audit log in lib/masking.js writes one row per record returned. Chunking
 * here means no call site has to remember the limit.
 */
const MAX_BULK_ROWS = 200;

async function inChunks(rows, fn) {
  const results = [];
  for (let i = 0; i < rows.length; i += MAX_BULK_ROWS) {
    results.push(...(await fn(rows.slice(i, i + MAX_BULK_ROWS))));
  }
  return results;
}

/** Data Store table handle for insertRow(s)/updateRow(s)/deleteRow(s). */
export function getTable(tableName) {
  if (isDemoMode()) return demoTable(tableName);
  const table = getCatalystApp().datastore().table(tableName);
  const CHUNKED = new Set(["insertRows", "updateRows", "deleteRows"]);
  // A Proxy (rather than spreading) so every other SDK method on the table
  // keeps working untouched — only the bulk writes are wrapped.
  return new Proxy(table, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== "function" || !CHUNKED.has(prop)) {
        return typeof value === "function" ? value.bind(target) : value;
      }
      return (rows) => inChunks(rows, (chunk) => value.call(target, chunk));
    },
  });
}
