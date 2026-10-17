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
  const count = (s: AttendanceStatus) => statuses.filter((x) => x === s).length;
  const present = count('PRESENT');
  const late = count('LATE');
  const absent = count('ABSENT');
  const counted = present + late + absent;
  return {
    present,
    late,
    absent,
    excused: count('EXCUSED'),
    percentage: counted
      ? Math.round(((present + late) / counted) * 1000) / 10
      : null,
  };
}
