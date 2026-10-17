import { createBrowserRouter, type RouteObject } from 'react-router';
import { AppShell } from '@/components/layout/AppShell';
import { ChangePasswordPage } from '@/features/auth/ChangePasswordPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { RequireRole } from '@/features/auth/RequireRole';
import { CalendarPage } from '@/features/calendar/CalendarPage';
import { CourseDetailPage } from '@/features/courses/CourseDetailPage';
import { CoursesPage } from '@/features/courses/CoursesPage';
import { EditStudentPage } from '@/features/students/EditStudentPage';
import { RegisterStudentPage } from '@/features/students/RegisterStudentPage';
import { StudentDetailPage } from '@/features/students/StudentDetailPage';
import { StudentsPage } from '@/features/students/StudentsPage';
import { TeachersPage } from '@/features/teachers/TeachersPage';
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
                children: [
                  { index: true, element: <DashboardPage /> },
                  { path: 'courses', element: <CoursesPage /> },
                  { path: 'courses/:id', element: <CourseDetailPage /> },
                  { path: 'students', element: <StudentsPage /> },
                  { path: 'students/new', element: <RegisterStudentPage /> },
                  { path: 'students/:id', element: <StudentDetailPage /> },
                  { path: 'students/:id/edit', element: <EditStudentPage /> },
                  { path: 'teachers', element: <TeachersPage /> },
                  { path: 'calendar', element: <CalendarPage /> },
                ],
              },
              {
                path: 'teacher',
                element: <RequireRole role="TEACHER" />,
                children: [
                  { index: true, element: <DashboardPage /> },
                  { path: 'calendar', element: <CalendarPage /> },
                ],
              },
              {
                path: 'student',
                element: <RequireRole role="STUDENT" />,
                children: [
                  { index: true, element: <DashboardPage /> },
                  { path: 'calendar', element: <CalendarPage /> },
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
