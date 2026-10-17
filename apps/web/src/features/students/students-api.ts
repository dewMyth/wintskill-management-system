import { api } from '@/services/api';
import type {
  EnrollmentStatus,
  Registration,
  StudentDetail,
  StudentPage,
  StudentPayload,
  StudentSummary,
} from './types';

export interface StudentQuery {
  search?: string;
  courseId?: string;
  page?: number;
}

const listTag = { type: 'Student' as const, id: 'LIST' };
const studentTag = (id: string) => ({ type: 'Student' as const, id });

export const studentsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getStudents: build.query<StudentPage, StudentQuery>({
      query: (params) => ({ url: 'students', params }),
      providesTags: [listTag],
    }),
    getStudent: build.query<StudentDetail, string>({
      query: (id) => `students/${id}`,
      providesTags: (_r, _e, id) => [studentTag(id)],
    }),
    findStudentByNic: build.query<StudentSummary, string>({
      query: (nic) => `students/by-nic/${encodeURIComponent(nic)}`,
    }),
    registerStudent: build.mutation<
      Registration,
      StudentPayload & { batchId: string }
    >({
      query: (body) => ({ url: 'students', method: 'POST', body }),
      invalidatesTags: [listTag, { type: 'Course', id: 'LIST' }],
    }),
    updateStudent: build.mutation<
      StudentDetail,
      { id: string } & Partial<StudentPayload>
    >({
      query: ({ id, ...body }) => ({
        url: `students/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [listTag, studentTag(id)],
    }),
    enrollStudent: build.mutation<
      { enrollmentId: string; registrationNo: string },
      { id: string; batchId: string }
    >({
      query: ({ id, batchId }) => ({
        url: `students/${id}/enrollments`,
        method: 'POST',
        body: { batchId },
      }),
      invalidatesTags: (_r, _e, { id }) => [listTag, studentTag(id)],
    }),
    updateEnrollment: build.mutation<
      void,
      { studentId: string; id: string; status: EnrollmentStatus }
    >({
      query: ({ id, status }) => ({
        url: `enrollments/${id}`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: (_r, _e, { studentId }) => [
        listTag,
        studentTag(studentId),
      ],
    }),
  }),
});

export const {
  useGetStudentsQuery,
  useGetStudentQuery,
  useLazyFindStudentByNicQuery,
  useRegisterStudentMutation,
  useUpdateStudentMutation,
  useEnrollStudentMutation,
  useUpdateEnrollmentMutation,
} = studentsApi;
