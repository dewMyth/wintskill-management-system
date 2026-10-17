import { api } from '@/services/api';
import type { Profile } from './types';

export const authApi = api.injectEndpoints({
  endpoints: (build) => ({
    me: build.query<Profile, void>({
      query: () => 'me',
      providesTags: ['Me'],
    }),
    changePassword: build.mutation<
      void,
      { currentPassword: string; newPassword: string }
    >({
      query: (body) => ({ url: 'me/password', method: 'POST', body }),
      invalidatesTags: ['Me'],
    }),
  }),
});

export const { useMeQuery, useLazyMeQuery, useChangePasswordMutation } =
  authApi;
