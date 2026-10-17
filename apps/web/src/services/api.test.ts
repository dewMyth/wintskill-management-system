import { makeStore } from '@/app/store';
import { authApi } from '@/features/auth/auth-api';
import { jsonResponse, profile } from '@/test/fixtures';
import { supabaseMock } from '@/test/supabase-mock';

vi.mock('@/lib/supabase', async () => ({
  supabase: (await import('@/test/supabase-mock')).supabaseMock,
}));

const fetchMock = vi.fn<typeof fetch>();
const authHeaders = () =>
  fetchMock.mock.calls.map(([req]) =>
    (req as Request).headers.get('authorization'),
  );

beforeEach(() => {
  vi.clearAllMocks();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  supabaseMock.token = 'token-1';
  supabaseMock.refreshResult = { error: null, token: 'token-2' };
});

async function fetchMe() {
  const store = makeStore({ auth: { user: profile() } });
  const result = await store.dispatch(authApi.endpoints.me.initiate());
  return { store, result };
}

describe('baseQueryWithReauth', () => {
  it('sends the Supabase access token to /api/v1', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, profile()));
    const { result } = await fetchMe();
    expect(result.data).toEqual(profile());
    expect((fetchMock.mock.calls[0][0] as Request).url).toBe(
      'http://localhost:3000/api/v1/me',
    );
    expect(authHeaders()).toEqual(['Bearer token-1']);
    expect(supabaseMock.auth.refreshSession).not.toHaveBeenCalled();
  });

  it('refreshes the session once on 401 and retries with the new token', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { message: 'Unauthorized' }))
      .mockResolvedValueOnce(jsonResponse(200, profile()));
    const { store, result } = await fetchMe();
    expect(result.data).toEqual(profile());
    expect(authHeaders()).toEqual(['Bearer token-1', 'Bearer token-2']);
    expect(store.getState().auth.user).toEqual(profile());
  });

  it('logs out when the session cannot be refreshed', async () => {
    supabaseMock.refreshResult = { error: new Error('expired'), token: '' };
    fetchMock.mockResolvedValueOnce(
      jsonResponse(401, { message: 'Unauthorized' }),
    );
    const { store, result } = await fetchMe();
    expect(result.error).toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(supabaseMock.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(store.getState().auth.user).toBeNull();
  });

  it('logs out when the retry is still unauthorized (e.g. deactivated account)', async () => {
    fetchMock.mockImplementation(async () =>
      jsonResponse(401, { message: 'Unauthorized' }),
    );
    const { store } = await fetchMe();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(store.getState().auth.user).toBeNull();
  });

  it('does not refresh on other errors', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(403, { message: 'Forbidden' }),
    );
    const { store } = await fetchMe();
    expect(supabaseMock.auth.refreshSession).not.toHaveBeenCalled();
    expect(store.getState().auth.user).toEqual(profile());
  });
});
