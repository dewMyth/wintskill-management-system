/** Sri Lanka (Asia/Colombo) is UTC+05:30 all year: there is no daylight saving. */
const OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Start and end (exclusive) of the academy's calendar day containing `now`. */
export function academyDay(now = new Date()) {
  const local = new Date(now.getTime() + OFFSET_MS);
  const start =
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) -
    OFFSET_MS;
  return { start: new Date(start), end: new Date(start + DAY_MS) };
}
