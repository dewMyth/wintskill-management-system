import { makeStore } from '@/app/store';
import { jsonResponse, profile } from '@/test/fixtures';
import { loggedOut } from './actions';
import { authApi } from './auth-api';
import { authSlice } from './auth-slice';

vi.mock('@/lib/supabase', async () => ({
  supabase: (await import('@/test/supabase-mock')).supabaseMock,
}));

describe('authSlice', () => {
  it('starts signed out', () => {
    expect(authSlice.reducer(undefined, { type: 'init' })).toEqual({
      user: null,
    });
  });

  it('stores the profile returned by /me', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(200, profile({ role: 'ADMIN' }))),
    );
    const store = makeStore();
    await store.dispatch(authApi.endpoints.me.initiate());
    expect(store.getState().auth.user).toEqual(profile({ role: 'ADMIN' }));
  });

  it('clears the profile on logout', () => {
    expect(authSlice.reducer({ user: profile() }, loggedOut())).toEqual({
      user: null,
    });
  });
});
