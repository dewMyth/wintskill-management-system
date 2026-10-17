import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { makeStore } from '@/app/store';
import { profile } from '@/test/fixtures';
import { RequireRole } from './RequireRole';
import type { Profile } from './types';

vi.mock('@/lib/supabase', async () => ({
  supabase: (await import('@/test/supabase-mock')).supabaseMock,
}));

const page = (text: string) => <p>{text}</p>;

function renderAt(path: string, user: Profile | null) {
  const router = createMemoryRouter(
    [
      { path: '/login', element: page('login page') },
      {
        element: <RequireRole allowPendingPassword />,
        children: [
          { path: '/change-password', element: page('change password page') },
        ],
      },
      {
        element: <RequireRole />,
        children: [
          { path: '/account', element: page('account page') },
          {
            path: '/admin',
            element: <RequireRole role="ADMIN" />,
            children: [{ index: true, element: page('admin page') }],
          },
          {
            path: '/student',
            element: <RequireRole role="STUDENT" />,
            children: [{ index: true, element: page('student page') }],
          },
        ],
      },
    ],
    { initialEntries: [path] },
  );
  render(
    <Provider store={makeStore({ auth: { user } })}>
      <RouterProvider router={router} />
    </Provider>,
  );
  return router;
}

describe('RequireRole', () => {
  it('sends signed-out users to login and remembers where they were going', () => {
    const router = renderAt('/admin', null);
    expect(screen.getByText('login page')).toBeInTheDocument();
    expect(router.state.location.state).toEqual({ from: '/admin' });
  });

  it('shows the page for the matching role', () => {
    renderAt('/admin', profile({ role: 'ADMIN' }));
    expect(screen.getByText('admin page')).toBeInTheDocument();
  });

  it('redirects another role to its own home', () => {
    renderAt('/admin', profile({ role: 'STUDENT' }));
    expect(screen.getByText('student page')).toBeInTheDocument();
  });

  it('allows any signed-in role when no role is required', () => {
    renderAt('/account', profile({ role: 'STUDENT' }));
    expect(screen.getByText('account page')).toBeInTheDocument();
  });

  it('forces a pending password change before anything else', () => {
    renderAt('/student', profile({ mustChangePassword: true }));
    expect(screen.getByText('change password page')).toBeInTheDocument();
  });

  it('keeps the change-password page reachable', () => {
    renderAt('/change-password', profile({ mustChangePassword: true }));
    expect(screen.getByText('change password page')).toBeInTheDocument();
  });
});
