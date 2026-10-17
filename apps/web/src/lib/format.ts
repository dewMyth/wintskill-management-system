const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** "2026-09-01T00:00:00.000Z" -> "1 Sep 2026" */
export const formatDate = (iso: string) => dateFormat.format(new Date(iso));

/** ISO timestamp -> "YYYY-MM-DD" for <input type="date"> */
export const toDateInput = (iso: string | null) => iso?.slice(0, 10) ?? '';

export const todayInput = () => new Date().toISOString().slice(0, 10);
