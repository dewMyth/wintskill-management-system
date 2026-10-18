import { createBrowserRouter, type RouteObject } from 'react-router';
import { AppShell } from '@/components/layout/AppShell';
import { Spinner } from '@/components/ui/spinner';
import { ChangePasswordPage } from '@/features/auth/ChangePasswordPage';
import { HomeRedirect } from '@/features/auth/HomeRedirect';
import { LoginPage } from '@/features/auth/LoginPage';
import { RequireRole } from '@/features/auth/RequireRole';
import { ErrorPage } from '@/pages/ErrorPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

// Pages load on first visit, so the sign-in screen does not wait for the calendar or PDF code.
const pages = {
  account: () =>
    import('@/pages/AccountPage').then((m) => ({ Component: m.AccountPage })),
  dashboard: () =>
    import('@/pages/DashboardPage').then((m) => ({
      Component: m.DashboardPage,
    })),
  courses: () =>
    import('@/features/courses/CoursesPage').then((m) => ({
      Component: m.CoursesPage,
    })),
  course: () =>
    import('@/features/courses/CourseDetailPage').then((m) => ({
      Component: m.CourseDetailPage,
    })),
  students: () =>
    import('@/features/students/StudentsPage').then((m) => ({
      Component: m.StudentsPage,
    })),
  registerStudent: () =>
    import('@/features/students/RegisterStudentPage').then((m) => ({
      Component: m.RegisterStudentPage,
    })),
  student: () =>
    import('@/features/students/StudentDetailPage').then((m) => ({
      Component: m.StudentDetailPage,
    })),
  editStudent: () =>
    import('@/features/students/EditStudentPage').then((m) => ({
      Component: m.EditStudentPage,
    })),
  teachers: () =>
    import('@/features/teachers/TeachersPage').then((m) => ({
      Component: m.TeachersPage,
    })),
  calendar: () =>
    import('@/features/calendar/CalendarPage').then((m) => ({
      Component: m.CalendarPage,
    })),
  lms: () =>
    import('@/features/lms/LmsPage').then((m) => ({ Component: m.LmsPage })),
  viewer: () =>
    import('@/features/lms/viewer/ViewerPage').then((m) => ({
      Component: m.ViewerPage,
    })),
  attendance: () =>
    import('@/features/attendance/AttendancePage').then((m) => ({
      Component: m.AttendancePage,
    })),
  register: () =>
    import('@/features/attendance/AttendanceSheetPage').then((m) => ({
      Component: m.AttendanceSheetPage,
    })),
};

export const routes: RouteObject[] = [
  {
    errorElement: <ErrorPage />,
    // Shown on first load while the requested page's code is fetched.
    hydrateFallbackElement: (
      <div
        className="flex min-h-dvh items-center justify-center"
        aria-busy="true"
        aria-label="Loading"
      >
        <Spinner className="size-8 text-primary" />
      </div>
    ),
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
              { path: 'account', lazy: pages.account },
              {
                path: 'admin',
                element: <RequireRole role="ADMIN" />,
                children: [
                  { index: true, lazy: pages.dashboard },
                  { path: 'courses', lazy: pages.courses },
                  { path: 'courses/:id', lazy: pages.course },
                  { path: 'students', lazy: pages.students },
                  { path: 'students/new', lazy: pages.registerStudent },
                  { path: 'students/:id', lazy: pages.student },
                  { path: 'students/:id/edit', lazy: pages.editStudent },
                  { path: 'teachers', lazy: pages.teachers },
                  { path: 'calendar', lazy: pages.calendar },
                  { path: 'materials', lazy: pages.lms },
                  { path: 'view/:type/:id', lazy: pages.viewer },
                  { path: 'attendance', lazy: pages.attendance },
                  { path: 'attendance/:sessionId', lazy: pages.register },
                ],
              },
              {
                path: 'teacher',
                element: <RequireRole role="TEACHER" />,
                children: [
                  { index: true, lazy: pages.dashboard },
                  { path: 'calendar', lazy: pages.calendar },
                  { path: 'materials', lazy: pages.lms },
                  { path: 'view/:type/:id', lazy: pages.viewer },
                  { path: 'attendance', lazy: pages.attendance },
                  { path: 'attendance/:sessionId', lazy: pages.register },
                ],
              },
              {
                path: 'student',
                element: <RequireRole role="STUDENT" />,
                children: [
                  { index: true, lazy: pages.dashboard },
                  { path: 'calendar', lazy: pages.calendar },
                  { path: 'learn', lazy: pages.lms },
                  { path: 'view/:type/:id', lazy: pages.viewer },
                ],
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
