import { api } from '@/services/api';
import type {
  Batch,
  BatchStatus,
  Course,
  CourseDetail,
  CourseListItem,
  CourseModule,
} from './types';

type CourseInput = { name: string; description?: string };
type ModuleInput = { code: string; title: string };
type BatchInput = { name?: string; startDate: string; endDate?: string | null };

const listTag = { type: 'Course' as const, id: 'LIST' };
const courseTag = (id: string) => ({ type: 'Course' as const, id });

export const coursesApi = api.injectEndpoints({
  endpoints: (build) => ({
    getCourses: build.query<CourseListItem[], void>({
      query: () => 'courses',
      providesTags: [listTag],
    }),
    getCourse: build.query<CourseDetail, string>({
      query: (id) => `courses/${id}`,
      providesTags: (_r, _e, id) => [courseTag(id)],
    }),
    createCourse: build.mutation<Course, CourseInput & { code: string }>({
      query: (body) => ({ url: 'courses', method: 'POST', body }),
      invalidatesTags: [listTag],
    }),
    updateCourse: build.mutation<
      Course,
      { id: string } & Partial<CourseInput & { isActive: boolean }>
    >({
      query: ({ id, ...body }) => ({
        url: `courses/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [listTag, courseTag(id)],
    }),
    deleteCourse: build.mutation<void, string>({
      query: (id) => ({ url: `courses/${id}`, method: 'DELETE' }),
      invalidatesTags: [listTag],
    }),

    createModule: build.mutation<
      CourseModule,
      { courseId: string } & ModuleInput
    >({
      query: ({ courseId, ...body }) => ({
        url: `courses/${courseId}/modules`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_r, _e, { courseId }) => [listTag, courseTag(courseId)],
    }),
    updateModule: build.mutation<
      CourseModule,
      { courseId: string; id: string } & Partial<ModuleInput>
    >({
      query: ({ courseId, id, ...body }) => ({
        url: `modules/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_r, _e, { courseId }) => [courseTag(courseId)],
    }),
    deleteModule: build.mutation<void, { courseId: string; id: string }>({
      query: ({ id }) => ({ url: `modules/${id}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { courseId }) => [listTag, courseTag(courseId)],
    }),
    reorderModules: build.mutation<
      void,
      { courseId: string; moduleIds: string[] }
    >({
      query: ({ courseId, moduleIds }) => ({
        url: `courses/${courseId}/modules/order`,
        method: 'PUT',
        body: { moduleIds },
      }),
      invalidatesTags: (_r, _e, { courseId }) => [courseTag(courseId)],
    }),

    createBatch: build.mutation<
      Batch,
      { courseId: string; code: string } & BatchInput
    >({
      query: ({ courseId, ...body }) => ({
        url: `courses/${courseId}/batches`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_r, _e, { courseId }) => [listTag, courseTag(courseId)],
    }),
    updateBatch: build.mutation<
      Batch,
      { courseId: string; id: string } & Partial<
        BatchInput & { status: BatchStatus }
      >
    >({
      query: ({ courseId, id, ...body }) => ({
        url: `batches/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_r, _e, { courseId }) => [courseTag(courseId)],
    }),
    deleteBatch: build.mutation<void, { courseId: string; id: string }>({
      query: ({ id }) => ({ url: `batches/${id}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { courseId }) => [listTag, courseTag(courseId)],
    }),
  }),
});

export const {
  useGetCoursesQuery,
  useGetCourseQuery,
  useCreateCourseMutation,
  useUpdateCourseMutation,
  useDeleteCourseMutation,
  useCreateModuleMutation,
  useUpdateModuleMutation,
  useDeleteModuleMutation,
  useReorderModulesMutation,
  useCreateBatchMutation,
  useUpdateBatchMutation,
  useDeleteBatchMutation,
} = coursesApi;
