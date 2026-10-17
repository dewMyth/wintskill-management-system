export type BatchStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED';

export interface Course {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface CourseListItem extends Course {
  moduleCount: number;
  batchCount: number;
}

export interface CourseModule {
  id: string;
  courseId: string;
  code: string;
  title: string;
  sortOrder: number;
}

export interface Batch {
  id: string;
  courseId: string;
  code: string;
  name: string;
  startDate: string;
  endDate: string | null;
  status: BatchStatus;
  enrollmentCount: number;
}

export interface BatchWithCourse extends Omit<Batch, 'enrollmentCount'> {
  course: Pick<Course, 'id' | 'code' | 'name' | 'isActive'>;
}

export interface CourseDetail extends Course {
  modules: CourseModule[];
  batches: Batch[];
  nextBatchCode: string | null;
}

export const batchStatusLabels: Record<BatchStatus, string> = {
  PLANNED: 'Planned',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
};
