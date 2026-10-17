import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import { loggedOut } from '@/features/auth/actions';
import { supabase } from '@/lib/supabase';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: new URL(
    import.meta.env.VITE_API_URL,
    window.location.origin,
  ).toString(),
  prepareHeaders: async (headers) => {
    const { data } = await supabase.auth.getSession();
    if (data.session)
      headers.set('authorization', `Bearer ${data.session.access_token}`);
    return headers;
  },
});

/** On 401, refresh the Supabase session once and retry; if that fails, log out. */
export const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extra) => {
  let result = await rawBaseQuery(args, api, extra);
  if (result.error?.status !== 401) return result;

  const { error } = await supabase.auth.refreshSession();
  if (!error) result = await rawBaseQuery(args, api, extra);
  if (result.error?.status === 401) {
    await supabase.auth.signOut({ scope: 'local' });
    api.dispatch(loggedOut());
  }
  return result;
};

export const api = createApi({
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'Me',
    'Course',
    'Batch',
    'Student',
    'Teacher',
    'Calendar',
    'Attendance',
  ],
  endpoints: () => ({}),
});

/** Turns an RTK Query error into a message for a toast or form. */
export function errorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
) {
  const data = (error as FetchBaseQueryError | undefined)?.data as
    { message?: string | string[] } | undefined;
  if (Array.isArray(data?.message)) return data.message.join('. ');
  return data?.message ?? fallback;
}

/** Downloads a file from the API with the user's token (a plain link cannot send it). */
export async function downloadFile(path: string) {
  const { data } = await supabase.auth.getSession();
  const res = await fetch(
    new URL(`${import.meta.env.VITE_API_URL}/${path}`, window.location.origin),
    {
      headers: { authorization: `Bearer ${data.session?.access_token}` },
    },
  );
  if (!res.ok) throw new Error('Download failed');
  const filename =
    /filename="([^"]+)"/.exec(
      res.headers.get('content-disposition') ?? '',
    )?.[1] ?? 'download';
  const url = URL.createObjectURL(await res.blob());
  const link = Object.assign(document.createElement('a'), {
    href: url,
    download: filename,
  });
  link.click();
  URL.revokeObjectURL(url);
}
