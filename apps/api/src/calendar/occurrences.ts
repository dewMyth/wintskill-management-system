const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
export const MAX_OCCURRENCES = 52;

export interface Interval {
  startsAt: Date;
  endsAt: Date;
}

/**
 * The first class plus one a week later, and so on, while each start is on or before `until`.
 * Plain 7-day steps are correct because Sri Lanka has no daylight-saving changes.
 * Returns null if that would exceed MAX_OCCURRENCES.
 */
export function weeklyOccurrences(
  first: Interval,
  until?: Date,
): Interval[] | null {
  const occurrences: Interval[] = [];
  for (let i = 0; ; i++) {
    const startsAt = new Date(first.startsAt.getTime() + i * WEEK_MS);
    if (i > 0 && (!until || startsAt > until)) break;
    if (occurrences.length === MAX_OCCURRENCES) return null;
    occurrences.push({
      startsAt,
      endsAt: new Date(first.endsAt.getTime() + i * WEEK_MS),
    });
  }
  return occurrences;
}
