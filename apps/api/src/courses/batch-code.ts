/** Batch codes are the intake year plus a letter: 2026A, 2026B, ... */
export const BATCH_CODE = /^\d{4}[A-Z]$/;

/** Next free code for the year, or null once A–Z are all used. */
export function nextBatchCode(
  year: number,
  existingCodes: string[],
): string | null {
  const used = existingCodes
    .filter((c) => c.startsWith(String(year)))
    .map((c) => c.charCodeAt(4));
  const next = used.length ? Math.max(...used) + 1 : 'A'.charCodeAt(0);
  return next > 'Z'.charCodeAt(0)
    ? null
    : `${year}${String.fromCharCode(next)}`;
}
