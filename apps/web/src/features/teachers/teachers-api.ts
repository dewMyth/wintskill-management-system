import { api } from '@/services/api';

export interface Teacher {
  id: string;
  username: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  avatarUrl: string | null;
}

type TeacherInput = {
  fullName: string;
  phone: string | null;
  email: string | null;
};
const listTag = { type: 'Teacher' as const, id: 'LIST' };

export const teachersApi = api.injectEndpoints({
  endpoints: (build) => ({
    getTeachers: build.query<Teacher[], void>({
      query: () => 'teachers',
      providesTags: [listTag],
    }),
    createTeacher: build.mutation<
      { teacher: Teacher; username: string; temporaryPassword: string },
      TeacherInput & { username: string }
    >({
      query: (body) => ({ url: 'teachers', method: 'POST', body }),
      invalidatesTags: [listTag],
    }),
    updateTeacher: build.mutation<Teacher, { id: string } & TeacherInput>({
      query: ({ id, ...body }) => ({
        url: `teachers/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: [listTag],
    }),
  }),
});

export const {
  useGetTeachersQuery,
  useCreateTeacherMutation,
  useUpdateTeacherMutation,
} = teachersApi;
