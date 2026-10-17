import type { AttendanceStatus } from '../generated/prisma/enums.js';

export interface AttendanceStats {
  present: number;
  late: number;
  absent: number;
  excused: number;
  /** (present + late) / (present + late + absent), 0–100 with one decimal; null when nothing counts yet. */
  percentage: number | null;
}

/**
 * Late counts as attended. Excused classes are left out of the percentage entirely,
 * and so are classes nobody marked (a forgotten register must not lower a student's figure).
 */
export function attendanceStats(statuses: AttendanceStatus[]): AttendanceStats {
  const counts: Partial<Record<AttendanceStatus, number>> = {};
  for (const s of statuses) counts[s] = (counts[s] ?? 0) + 1;
  return statsFromCounts(counts);
}

/** Same as attendanceStats, from per-status counts (e.g. a database groupBy). */
export function statsFromCounts({
  PRESENT: present = 0,
  LATE: late = 0,
  ABSENT: absent = 0,
  EXCUSED: excused = 0,
}: Partial<Record<AttendanceStatus, number>>): AttendanceStats {
  const counted = present + late + absent;
  return {
    present,
    late,
    absent,
    excused,
    percentage: counted
      ? Math.round(((present + late) / counted) * 1000) / 10
      : null,
  };
}
