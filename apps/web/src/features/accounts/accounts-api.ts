import { api } from '@/services/api';

/** Admin actions on any login (student or teacher). They refresh both lists. */
const affected = [
  { type: 'Student' as const },
  { type: 'Teacher' as const, id: 'LIST' },
];

export const accountsApi = api.injectEndpoints({
  endpoints: (build) => ({
    resetPassword: build.mutation<
      { username: string; temporaryPassword: string },
      string
    >({
      query: (profileId) => ({
        url: `accounts/${profileId}/reset-password`,
        method: 'POST',
      }),
      invalidatesTags: affected,
    }),
    setAccountStatus: build.mutation<
      void,
      { profileId: string; isActive: boolean }
    >({
      query: ({ profileId, isActive }) => ({
        url: `accounts/${profileId}/status`,
        method: 'PATCH',
        body: { isActive },
      }),
      invalidatesTags: affected,
    }),
    uploadPhoto: build.mutation<
      { avatarUrl: string },
      { profileId: string; file: File }
    >({
      query: ({ profileId, file }) => {
        const body = new FormData();
        body.append('photo', file);
        return { url: `accounts/${profileId}/photo`, method: 'PUT', body };
      },
      invalidatesTags: affected,
    }),
  }),
});

export const {
  useResetPasswordMutation,
  useSetAccountStatusMutation,
  useUploadPhotoMutation,
} = accountsApi;
