import { vi } from 'vitest';

/** Replaces the Supabase client; tests set the token and refresh outcome. */
export const supabaseMock = {
  token: 'token-1' as string | null,
  refreshResult: { error: null as Error | null, token: 'token-2' },
  auth: {
    getSession: vi.fn(async () => ({
      data: {
        session: supabaseMock.token
          ? { access_token: supabaseMock.token }
          : null,
      },
    })),
    refreshSession: vi.fn(async () => {
      if (!supabaseMock.refreshResult.error)
        supabaseMock.token = supabaseMock.refreshResult.token;
      return { error: supabaseMock.refreshResult.error };
    }),
    signOut: vi.fn(async () => {
      supabaseMock.token = null;
      return { error: null };
    }),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
  },
};
