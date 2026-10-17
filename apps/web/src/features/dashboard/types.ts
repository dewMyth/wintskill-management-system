import type { AttendanceStats } from '@/features/attendance/types';
import type { ClassSession } from '@/features/calendar/types';

export interface MarkedSession extends ClassSession {
  marked: number;
  attended: number;
}

export interface AdminDashboard {
  threshold: number;
  counts: {
    activeStudents: number;
    teachers: number;
    courses: number;
    openIntakes: number;
  };
  batches: {
    id: string;
    code: string;
    name: string;
    status: 'PLANNED' | 'ACTIVE';
    course: { id: string; code: string; name: string };
    students: number;
    attendance: number | null;
  }[];
  today: MarkedSession[];
  unmarkedRecently: number;
  lowAttendance: {
    studentId: string;
    fullName: string;
    registrationNo: string;
    batch: string;
    percentage: number;
  }[];
}

export interface TeacherDashboard {
  today: MarkedSession[];
  upcoming: ClassSession[];
  awaitingAttendance: ClassSession[];
}

export interface StudentDashboard {
  threshold: number;
  courses: {
    enrollmentId: string;
    registrationNo: string;
    course: { id: string; code: string; name: string };
    batch: { id: string; code: string };
    nextClass: ClassSession | null;
    attendance: AttendanceStats;
    modules: {
      id: string;
      code: string;
      title: string;
      viewed: number;
      total: number;
    }[];
    upcomingAssignments: {
      id: string;
      title: string;
      dueAt: string;
      module: { code: string };
    }[];
  }[];
}
