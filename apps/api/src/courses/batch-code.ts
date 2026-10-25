/** Batch codes are the intake year and that year's intake number for the course: 2026/01, 2026/02, ... */
export const BATCH_CODE = /^\d{4}\/(0[1-9]|[1-9]\d)$/;

/** Next free code for the year, or null once intakes 01–99 are all used. */
export function nextBatchCode(
  year: number,
  existingCodes: string[],
): string | null {
  const used = existingCodes
    .filter((c) => c.startsWith(`${year}/`))
    .map((c) => Number(c.slice(5)));
  const next = used.length ? Math.max(...used) + 1 : 1;
  return next > 99 ? null : `${year}/${String(next).padStart(2, '0')}`;
}
