import type { BatchStatus, Course } from '@/features/courses/types';

export type EnrollmentStatus = 'ACTIVE' | 'COMPLETED' | 'WITHDRAWN';
export type QualificationLevel = 'OL' | 'AL';

export interface SubjectResult {
  subject: string;
  result: string;
}

export interface Qualification {
  level: QualificationLevel;
  year: number;
  indexNo: string | null;
  subjects: SubjectResult[];
}

type CourseRef = Pick<Course, 'id' | 'code' | 'name'>;

export interface StudentListItem {
  id: string;
  profileId: string;
  fullName: string;
  username: string;
  mobilePhone: string | null;
  nicOrPassport: string;
  isActive: boolean;
  enrollments: {
    id: string;
    registrationNo: string;
    status: EnrollmentStatus;
    course: CourseRef;
  }[];
}

export interface StudentPage {
  items: StudentListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Enrollment {
  id: string;
  registrationNo: string;
  status: EnrollmentStatus;
  enrolledAt: string;
  batch: {
    id: string;
    code: string;
    name: string;
    status: BatchStatus;
    course: CourseRef;
  };
}

export interface StudentDetail {
  id: string;
  profileId: string;
  username: string;
  fullName: string;
  nameWithInitials: string;
  nicOrPassport: string;
  dateOfBirth: string;
  address: string;
  schoolAttended: string | null;
  landPhone: string | null;
  mobilePhone: string | null;
  email: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  notes: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  avatarUrl: string | null;
  qualifications: Qualification[];
  enrollments: Enrollment[];
}

/** What the API accepts for registering or editing a student. */
export interface StudentPayload {
  fullName: string;
  nameWithInitials: string;
  nicOrPassport: string;
  dateOfBirth: string;
  address: string;
  schoolAttended: string | null;
  landPhone: string | null;
  mobilePhone: string;
  email: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  qualifications: Qualification[];
}

export interface Registration {
  studentId: string;
  profileId: string;
  registrationNo: string;
  username: string;
  temporaryPassword: string;
}

export interface StudentSummary {
  id: string;
  fullName: string;
  username: string;
  enrollments: { registrationNo: string; batchId: string; course: CourseRef }[];
}

export const enrollmentStatusLabels: Record<EnrollmentStatus, string> = {
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  WITHDRAWN: 'Withdrawn',
};
