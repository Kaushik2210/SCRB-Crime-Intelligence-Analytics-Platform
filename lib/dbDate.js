/**
 * Catalyst's Data Store does not accept ISO-8601 strings — it rejects them
 * with "Invalid input value for <col>. datetime value expected", and ZCQL
 * comparisons against them don't match. DateTime columns expect
 * "YYYY-MM-DD HH:MM:SS"; Date columns expect "YYYY-MM-DD".
 *
 * Use these whenever a JS Date crosses into a ZCQL string or a row payload.
 */
export function toDbDateTime(date) {
  const d = new Date(date);
  const p = (n) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ` +
    `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`
  );
}

export function toDbDate(date) {
  return toDbDateTime(date).slice(0, 10);
}
