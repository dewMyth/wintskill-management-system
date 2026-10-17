import type { ClassSession } from '@/features/calendar/types';
import type { EnrollmentStatus } from '@/features/students/types';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

export interface RecentSession extends ClassSession {
  rosterSize: number;
  marked: number;
  attended: number;
}

export interface RosterEntry {
  enrollmentId: string;
  registrationNo: string;
  fullName: string;
  enrollmentStatus: EnrollmentStatus;
  status: AttendanceStatus | null;
}

export interface AttendanceSheet {
  session: ClassSession;
  started: boolean;
  roster: RosterEntry[];
}

export interface AttendanceStats {
  present: number;
  late: number;
  absent: number;
  excused: number;
  percentage: number | null;
}

export interface BatchReport {
  batch: {
    id: string;
    code: string;
    name: string;
    course: { id: string; code: string; name: string };
  };
  heldSessions: number;
  /** Below this percentage attendance is highlighted (server setting). */
  threshold: number;
  modules: { id: string; code: string; title: string }[];
  rows: {
    enrollmentId: string;
    registrationNo: string;
    fullName: string;
    enrollmentStatus: EnrollmentStatus;
    overall: AttendanceStats;
    byModule: Record<string, AttendanceStats>;
  }[];
}

/** Order a tap cycles through. */
export const statusCycle: AttendanceStatus[] = [
  'PRESENT',
  'ABSENT',
  'LATE',
  'EXCUSED',
];

export const statusLabels: Record<AttendanceStatus, string> = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  LATE: 'Late',
  EXCUSED: 'Excused',
};
