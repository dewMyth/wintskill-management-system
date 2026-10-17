import { api } from '@/services/api';
import type {
  AdminDashboard,
  StudentDashboard,
  TeacherDashboard,
} from './types';

// Always fetched fresh: a dashboard summarises things that change all day.
const fresh = { keepUnusedDataFor: 0 };

export const dashboardApi = api.injectEndpoints({
  endpoints: (build) => ({
    getAdminDashboard: build.query<AdminDashboard, void>({
      query: () => 'dashboard',
      ...fresh,
    }),
    getTeacherDashboard: build.query<TeacherDashboard, void>({
      query: () => 'dashboard',
      ...fresh,
    }),
    getStudentDashboard: build.query<StudentDashboard, void>({
      query: () => 'dashboard',
      ...fresh,
    }),
  }),
});

export const {
  useGetAdminDashboardQuery,
  useGetTeacherDashboardQuery,
  useGetStudentDashboardQuery,
} = dashboardApi;
