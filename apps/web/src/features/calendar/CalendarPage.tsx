import type {
  DatesSetArg,
  EventClickArg,
  EventDropArg,
  EventInput,
} from '@fullcalendar/core';
import enGbLocale from '@fullcalendar/core/locales/en-gb';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin, {
  type DateClickArg,
  type EventResizeDoneArg,
} from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { CalendarPlusIcon, FlagIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAppSelector } from '@/app/store';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGetBatchesQuery } from '@/features/courses/courses-api';
import { useMediaQuery } from '@/lib/use-media-query';
import { errorMessage } from '@/services/api';
import {
  useGetCalendarQuery,
  useUpdateEventMutation,
  useUpdateSessionMutation,
} from './calendar-api';
import { warnAboutClashes } from './clash-warning';
import { DetailsDialog, type CalendarItem } from './DetailsDialog';
import { EventFormDialog } from './EventFormDialog';
import { SessionFormDialog } from './SessionFormDialog';
import type { CalendarFeed, EventType } from './types';

const ALL = 'all';
const eventColors: Record<EventType, string> = {
  EXAM: 'var(--gold)',
  HOLIDAY: 'var(--rose-gold)',
  OTHER: 'var(--forest-200)',
};

function toFullCalendar(
  feed: CalendarFeed | undefined,
  showTeacher: boolean,
): EventInput[] {
  if (!feed) return [];
  return [
    ...feed.sessions.map((s) => ({
      id: `session:${s.id}`,
      title:
        `${s.batch.course.code} ${s.batch.code}` +
        (s.module ? ` · ${s.module.title}` : '') +
        (s.venue ? ` · ${s.venue}` : '') +
        (showTeacher ? ` · ${s.teacher.fullName}` : ''),
      start: s.startsAt,
      end: s.endsAt,
      backgroundColor: 'var(--forest-700)',
      borderColor: 'var(--forest-700)',
      textColor: 'var(--cream)',
      extendedProps: {
        item: { kind: 'session', session: s } satisfies CalendarItem,
      },
    })),
    ...feed.events.map((e) => ({
      id: `event:${e.id}`,
      title: e.batch
        ? `${e.title} · ${e.batch.course.code} ${e.batch.code}`
        : e.title,
      start: e.startsAt,
      end: e.endsAt,
      allDay: e.allDay,
      backgroundColor: eventColors[e.type],
      borderColor: eventColors[e.type],
      textColor: 'var(--forest-950)',
      durationEditable: !e.allDay,
      extendedProps: {
        item: { kind: 'event', event: e } satisfies CalendarItem,
      },
    })),
  ];
}

/** One calendar for everyone: admins plan it, teachers and students see their part. */
export function CalendarPage() {
  const role = useAppSelector((s) => s.auth.user!.role);
  const isAdmin = role === 'ADMIN';
  const isPhone = useMediaQuery('(max-width: 767px)');
  const [range, setRange] = useState<{ from: string; to: string }>();
  const [batchId, setBatchId] = useState(ALL);
  const [details, setDetails] = useState<CalendarItem>();
  const [sessionForm, setSessionForm] = useState<{
    open: boolean;
    edit?: CalendarItem;
    start?: Date;
    end?: Date;
  }>({
    open: false,
  });
  const [eventForm, setEventForm] = useState<{
    open: boolean;
    edit?: CalendarItem;
    start?: Date;
    allDay?: boolean;
  }>({
    open: false,
  });

  const { data: batches } = useGetBatchesQuery(undefined, { skip: !isAdmin });
  const { data: feed, isFetching } = useGetCalendarQuery(
    { ...range!, batchId: batchId === ALL ? undefined : batchId },
    { skip: !range },
  );
  const [updateSession] = useUpdateSessionMutation();
  const [updateEvent] = useUpdateEventMutation();
  const events = useMemo(() => toFullCalendar(feed, isAdmin), [feed, isAdmin]);
  // Stable objects: the forms reset when these change, so a new object each render would wipe typing.
  const sessionInitial = useMemo(
    () => ({
      start: sessionForm.start,
      batchId: batchId === ALL ? undefined : batchId,
    }),
    [sessionForm.start, batchId],
  );
  const eventInitial = useMemo(
    () =>
      eventForm.start
        ? { start: eventForm.start, allDay: eventForm.allDay }
        : undefined,
    [eventForm.start, eventForm.allDay],
  );

  const openItem = (item: CalendarItem) => {
    if (!isAdmin) setDetails(item);
    else if (item.kind === 'session')
      setSessionForm({ open: true, edit: item });
    else setEventForm({ open: true, edit: item });
  };

  // Drag and resize (desktop, admins only). Undo the move if the API refuses it.
  const move = async (info: EventDropArg | EventResizeDoneArg) => {
    const item = info.event.extendedProps.item as CalendarItem;
    const times = {
      startsAt: info.event.start!.toISOString(),
      endsAt: info.event.end!.toISOString(),
    };
    if (item.kind === 'session') {
      const result = await updateSession({ id: item.session.id, ...times });
      if (result.error) {
        info.revert();
        return toast.error(errorMessage(result.error));
      }
      toast.success('Class moved');
      warnAboutClashes(result.data.clashes);
    } else {
      const result = await updateEvent({ id: item.event.id, ...times });
      if (result.error) {
        info.revert();
        return toast.error(errorMessage(result.error));
      }
      toast.success('Event moved');
    }
  };

  return (
    <>
      <PageHeader
        title="Calendar"
        actions={
          isAdmin && (
            <>
              <Button
                className="min-h-11"
                onClick={() => setSessionForm({ open: true })}
              >
                <CalendarPlusIcon /> Add class
              </Button>
              <Button
                variant="outline"
                className="min-h-11"
                onClick={() => setEventForm({ open: true })}
              >
                <FlagIcon /> Add event
              </Button>
            </>
          )
        }
      />
      {isAdmin && (
        <Select value={batchId} onValueChange={setBatchId}>
          <SelectTrigger
            className="mb-4 w-full sm:w-72"
            aria-label="Show intake"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL} className="min-h-11">
              All intakes
            </SelectItem>
            {batches?.map((b) => (
              <SelectItem key={b.id} value={b.id} className="min-h-11">
                {b.course.code} {b.code} · {b.course.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <div
        className={`wintskill-calendar rounded-xl border bg-card p-2 sm:p-4 ${isFetching ? 'opacity-70' : ''}`}
      >
        <FullCalendar
          key={isPhone ? 'phone' : 'desktop'}
          plugins={[
            dayGridPlugin,
            timeGridPlugin,
            listPlugin,
            interactionPlugin,
          ]}
          locale={enGbLocale}
          initialView={isPhone ? 'listWeek' : 'timeGridWeek'}
          headerToolbar={
            isPhone
              ? { left: 'prev,next', center: 'title', right: 'today' }
              : {
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,listWeek',
                }
          }
          footerToolbar={
            isPhone ? { center: 'listWeek,dayGridMonth' } : undefined
          }
          buttonText={{
            today: 'Today',
            month: 'Month',
            week: 'Week',
            list: 'List',
          }}
          views={{ listWeek: { buttonText: 'List' } }}
          firstDay={1}
          height="auto"
          nowIndicator
          allDayText="All day"
          slotMinTime="07:00:00"
          slotMaxTime="20:00:00"
          noEventsContent="Nothing scheduled"
          events={events}
          datesSet={(arg: DatesSetArg) =>
            setRange({
              from: arg.start.toISOString(),
              to: arg.end.toISOString(),
            })
          }
          eventClick={(arg: EventClickArg) =>
            openItem(arg.event.extendedProps.item as CalendarItem)
          }
          editable={isAdmin && !isPhone}
          eventDrop={move}
          eventResize={move}
          dateClick={
            isAdmin
              ? (arg: DateClickArg) =>
                  arg.allDay
                    ? setEventForm({
                        open: true,
                        start: arg.date,
                        allDay: true,
                      })
                    : setSessionForm({ open: true, start: arg.date })
              : undefined
          }
        />
      </div>

      {isAdmin && (
        <>
          <SessionFormDialog
            open={sessionForm.open}
            onOpenChange={(open) => setSessionForm((f) => ({ ...f, open }))}
            session={
              sessionForm.edit?.kind === 'session'
                ? sessionForm.edit.session
                : undefined
            }
            initial={sessionInitial}
          />
          <EventFormDialog
            open={eventForm.open}
            onOpenChange={(open) => setEventForm((f) => ({ ...f, open }))}
            event={
              eventForm.edit?.kind === 'event'
                ? eventForm.edit.event
                : undefined
            }
            initial={eventInitial}
          />
        </>
      )}
      <DetailsDialog
        item={details}
        onOpenChange={(open) => !open && setDetails(undefined)}
        hideTeacher={role === 'TEACHER'}
      />
    </>
  );
}
