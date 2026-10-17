import { supabase } from '@/lib/supabase';
import { api } from '@/services/api';
import type {
  Assignment,
  CourseContent,
  LmsCourse,
  Material,
  ViewInfo,
} from './types';

const tag = { type: 'Lms' as const };
type AssignmentInput = {
  title: string;
  description: string | null;
  dueAt: string | null;
};

export const lmsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getLmsCourses: build.query<LmsCourse[], void>({
      query: () => 'lms/courses',
      providesTags: [tag],
    }),
    getCourseContent: build.query<CourseContent, string>({
      query: (courseId) => `courses/${courseId}/content`,
      providesTags: [tag],
    }),
    requestUpload: build.mutation<
      { path: string; token: string },
      {
        moduleId: string;
        fileName: string;
        contentType: string;
        size: number;
        purpose: 'material' | 'assignment';
      }
    >({
      query: ({ moduleId, ...body }) => ({
        url: `modules/${moduleId}/uploads`,
        method: 'POST',
        body,
      }),
    }),
    createMaterial: build.mutation<
      Material,
      { moduleId: string; title: string; storagePath: string }
    >({
      query: ({ moduleId, ...body }) => ({
        url: `modules/${moduleId}/materials`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [tag],
    }),
    updateMaterial: build.mutation<Material, { id: string; title: string }>({
      query: ({ id, ...body }) => ({
        url: `materials/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: [tag],
    }),
    deleteMaterial: build.mutation<void, string>({
      query: (id) => ({ url: `materials/${id}`, method: 'DELETE' }),
      invalidatesTags: [tag],
    }),
    reorderMaterials: build.mutation<
      void,
      { moduleId: string; materialIds: string[] }
    >({
      query: ({ moduleId, materialIds }) => ({
        url: `modules/${moduleId}/materials/order`,
        method: 'PUT',
        body: { materialIds },
      }),
      invalidatesTags: [tag],
    }),
    createAssignment: build.mutation<
      Assignment,
      { moduleId: string; storagePath?: string } & AssignmentInput
    >({
      query: ({ moduleId, ...body }) => ({
        url: `modules/${moduleId}/assignments`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [tag],
    }),
    updateAssignment: build.mutation<
      Assignment,
      { id: string } & AssignmentInput
    >({
      query: ({ id, ...body }) => ({
        url: `assignments/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: [tag],
    }),
    deleteAssignment: build.mutation<void, string>({
      query: (id) => ({ url: `assignments/${id}`, method: 'DELETE' }),
      invalidatesTags: [tag],
    }),
    // Links expire in a minute, so never serve a cached one; a view also changes "viewed" ticks.
    viewFile: build.query<
      ViewInfo,
      { type: 'material' | 'assignment'; id: string }
    >({
      query: ({ type, id }) => `${type}s/${id}/view`,
      keepUnusedDataFor: 0,
      onQueryStarted: async (_arg, { dispatch, queryFulfilled }) => {
        await queryFulfilled;
        dispatch(lmsApi.util.invalidateTags([tag]));
      },
    }),
  }),
});

export const {
  useGetLmsCoursesQuery,
  useGetCourseContentQuery,
  useRequestUploadMutation,
  useCreateMaterialMutation,
  useUpdateMaterialMutation,
  useDeleteMaterialMutation,
  useReorderMaterialsMutation,
  useCreateAssignmentMutation,
  useUpdateAssignmentMutation,
  useDeleteAssignmentMutation,
  useViewFileQuery,
} = lmsApi;

/** Sends a file straight to private storage using the one-time token from the API. */
export async function uploadToStorage(path: string, token: string, file: File) {
  const { error } = await supabase.storage
    .from('materials')
    .uploadToSignedUrl(path, token, file, { contentType: file.type });
  if (error)
    throw new Error('The upload failed. Check your connection and try again.');
}
