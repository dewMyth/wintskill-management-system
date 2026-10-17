export type EventType = 'EXAM' | 'HOLIDAY' | 'OTHER';

interface BatchRef {
  id: string;
  code: string;
  course: { id: string; code: string; name: string };
}

export interface ClassSession {
  id: string;
  batchId: string;
  moduleId: string | null;
  teacherId: string;
  startsAt: string;
  endsAt: string;
  venue: string | null;
  notes: string | null;
  batch: BatchRef;
  module: { id: string; code: string; title: string } | null;
  teacher: { id: string; fullName: string };
}

export interface CalendarEvent {
  id: string;
  batchId: string | null;
  title: string;
  type: EventType;
  allDay: boolean;
  startsAt: string;
  endsAt: string;
  description: string | null;
  batch: BatchRef | null;
}

export interface Clash {
  id: string;
  startsAt: string;
  endsAt: string;
  batch: string;
  teacher: string;
}

export interface CalendarFeed {
  sessions: ClassSession[];
  events: CalendarEvent[];
}

export const eventTypeLabels: Record<EventType, string> = {
  EXAM: 'Exam',
  HOLIDAY: 'Holiday',
  OTHER: 'Other',
};
