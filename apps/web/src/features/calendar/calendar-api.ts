import { api } from '@/services/api';
import type {
  CalendarEvent,
  CalendarFeed,
  Clash,
  ClassSession,
  EventType,
} from './types';

export interface SessionInput {
  moduleId: string | null;
  teacherId: string;
  startsAt: string;
  endsAt: string;
  venue: string | null;
  notes: string | null;
}

/** Which classes of a weekly series a change applies to. */
export type SessionScope = 'one' | 'following';

export interface EventInput {
  batchId: string | null;
  title: string;
  type: EventType;
  allDay: boolean;
  startsAt: string;
  endsAt: string;
  description: string | null;
}

const tag = { type: 'Calendar' as const };

export const calendarApi = api.injectEndpoints({
  endpoints: (build) => ({
    getCalendar: build.query<
      CalendarFeed,
      { from: string; to: string; batchId?: string }
    >({
      query: (params) => ({ url: 'calendar', params }),
      providesTags: [tag],
    }),
    createSession: build.mutation<
      { sessions: ClassSession[]; clashes: Clash[] },
      SessionInput & { batchId: string; repeatWeeklyUntil?: string }
    >({
      query: (body) => ({ url: 'sessions', method: 'POST', body }),
      invalidatesTags: [tag],
    }),
    updateSession: build.mutation<
      { session: ClassSession; updated: number; clashes: Clash[] },
      { id: string; scope?: SessionScope } & Partial<SessionInput>
    >({
      query: ({ id, ...body }) => ({
        url: `sessions/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: [tag],
    }),
    deleteSession: build.mutation<void, { id: string; scope?: SessionScope }>({
      query: ({ id, scope }) => ({
        url: `sessions/${id}`,
        method: 'DELETE',
        params: scope ? { scope } : undefined,
      }),
      invalidatesTags: [tag],
    }),
    createEvent: build.mutation<CalendarEvent, EventInput>({
      query: (body) => ({ url: 'events', method: 'POST', body }),
      invalidatesTags: [tag],
    }),
    updateEvent: build.mutation<
      CalendarEvent,
      { id: string } & Partial<EventInput>
    >({
      query: ({ id, ...body }) => ({
        url: `events/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: [tag],
    }),
    deleteEvent: build.mutation<void, string>({
      query: (id) => ({ url: `events/${id}`, method: 'DELETE' }),
      invalidatesTags: [tag],
    }),
  }),
});

export const {
  useGetCalendarQuery,
  useCreateSessionMutation,
  useUpdateSessionMutation,
  useDeleteSessionMutation,
  useCreateEventMutation,
  useUpdateEventMutation,
  useDeleteEventMutation,
} = calendarApi;
