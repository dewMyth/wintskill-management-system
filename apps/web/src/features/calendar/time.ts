// Form fields hold local date ("YYYY-MM-DD") and time ("HH:mm"); the API takes instants.
const pad = (n: number) => String(n).padStart(2, '0');

export const localDate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const localTime = (d: Date) =>
  `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** Local date + time -> ISO instant. */
export const toInstant = (date: string, time = '00:00') =>
  new Date(`${date}T${time}`).toISOString();

/** The last moment of a local day, for "repeat until" (inclusive). */
export const endOfDay = (date: string) =>
  new Date(`${date}T23:59:59.999`).toISOString();

/** All-day events end at midnight after their last day. */
export const dayAfter = (date: string) => {
  const d = new Date(`${date}T00:00`);
  d.setDate(d.getDate() + 1);
  return localDate(d);
};
export const dayBefore = (date: string) => {
  const d = new Date(`${date}T00:00`);
  d.setDate(d.getDate() - 1);
  return localDate(d);
};

const timeFormat = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
});
const dayFormat = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

/** "Mon 2 Nov, 09:00–12:00" */
export const formatTimeRange = (startsAt: string, endsAt: string) =>
  `${dayFormat.format(new Date(startsAt))}, ${timeFormat.format(new Date(startsAt))}–${timeFormat.format(new Date(endsAt))}`;

/** "Mon 2 Nov" or "Mon 2 Nov – Wed 4 Nov" for all-day events (exclusive end). */
export const formatDayRange = (startsAt: string, endsAt: string) => {
  const last = new Date(new Date(endsAt).getTime() - 1);
  const first = dayFormat.format(new Date(startsAt));
  return localDate(new Date(startsAt)) === localDate(last)
    ? first
    : `${first} – ${dayFormat.format(last)}`;
};
