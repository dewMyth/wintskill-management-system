import { api } from '@/services/api';
import type {
  AttendanceSheet,
  AttendanceStatus,
  BatchReport,
  RecentSession,
} from './types';

const tag = { type: 'Attendance' as const };

export const attendanceApi = api.injectEndpoints({
  endpoints: (build) => ({
    getRecentSessions: build.query<RecentSession[], { batchId?: string }>({
      query: (params) => ({ url: 'attendance/sessions', params }),
      providesTags: [tag],
    }),
    getAttendanceSheet: build.query<AttendanceSheet, string>({
      query: (sessionId) => `sessions/${sessionId}/attendance`,
      providesTags: [tag],
    }),
    saveAttendance: build.mutation<
      AttendanceSheet,
      {
        sessionId: string;
        records: { enrollmentId: string; status: AttendanceStatus }[];
      }
    >({
      query: ({ sessionId, records }) => ({
        url: `sessions/${sessionId}/attendance`,
        method: 'PUT',
        body: { records },
      }),
      invalidatesTags: [tag],
    }),
    getBatchReport: build.query<BatchReport, string>({
      query: (batchId) => `attendance/batches/${batchId}`,
      providesTags: [tag],
    }),
  }),
});

export const {
  useGetRecentSessionsQuery,
  useGetAttendanceSheetQuery,
  useSaveAttendanceMutation,
  useGetBatchReportQuery,
} = attendanceApi;
