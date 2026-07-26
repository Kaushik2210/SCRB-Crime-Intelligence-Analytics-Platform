/**
 * Catalyst Data Store ROWIDs are 17+ digit values that exceed
 * `Number.MAX_SAFE_INTEGER` (9007199254740991) — e.g. 52881000000079977
 * round-trips through `Number()` as 52881000000079976. They are therefore
 * treated as opaque STRINGS everywhere in this app: never `Number(id)`, never
 * `Number.isInteger(id)`, and never compared with `===` across types.
 *
 * These helpers replace the integer guards that were correct against the old
 * Postgres autoincrement ids.
 */

/** True when `value` is a plain digits-only id, safe to splice into ZCQL. */
export function isRowId(value) {
  return typeof value === "string" ? /^\d+$/.test(value) : /^\d+$/.test(String(value ?? ""));
}

/** Normalizes an id (string | number) to its string form for comparisons. */
export function toRowId(value) {
  return value == null ? null : String(value);
}

/** Throws unless `value` is a valid ROWID — an injection guard for interpolation. */
export function assertRowId(value, label) {
  if (!isRowId(value)) {
    throw new Error(`${label} must be a numeric row id, got: ${JSON.stringify(value)}`);
  }
  return String(value);
}

/** Equality across mixed string/number id representations. */
export function sameRowId(a, b) {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}
