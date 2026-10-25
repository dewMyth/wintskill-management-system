/**
 * Intake codes are the start year and that year's intake number for the course: 2026/01, 2026/02, ...
 * The API assigns the code; this only previews it (same rule as apps/api/src/courses/batch-code.ts).
 */
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
