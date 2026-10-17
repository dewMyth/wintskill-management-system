import { createBrowserRouter, type RouteObject } from 'react-router';
import { AppShell } from '@/components/layout/AppShell';
import { ChangePasswordPage } from '@/features/auth/ChangePasswordPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { RequireRole } from '@/features/auth/RequireRole';
import { HomeRedirect } from '@/features/auth/HomeRedirect';
import { AccountPage } from '@/pages/AccountPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ErrorPage } from '@/pages/ErrorPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export const routes: RouteObject[] = [
  {
    errorElement: <ErrorPage />,
    children: [
      { path: 'login', element: <LoginPage /> },
      {
        element: <RequireRole allowPendingPassword />,
        children: [
          { path: 'change-password', element: <ChangePasswordPage /> },
        ],
      },
      {
        element: <RequireRole />,
        children: [
          { index: true, element: <HomeRedirect /> },
          {
            element: <AppShell />,
            children: [
              { path: 'account', element: <AccountPage /> },
              {
                path: 'admin',
                element: <RequireRole role="ADMIN" />,
                children: [{ index: true, element: <DashboardPage /> }],
              },
              {
                path: 'teacher',
                element: <RequireRole role="TEACHER" />,
                children: [{ index: true, element: <DashboardPage /> }],
              },
              {
                path: 'student',
                element: <RequireRole role="STUDENT" />,
                children: [{ index: true, element: <DashboardPage /> }],
              },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
