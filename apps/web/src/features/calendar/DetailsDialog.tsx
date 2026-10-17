import { ClipboardCheckIcon } from 'lucide-react';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDayRange, formatTimeRange } from './time';
import {
  eventTypeLabels,
  type CalendarEvent,
  type ClassSession,
} from './types';

export type CalendarItem =
  | { kind: 'session'; session: ClassSession }
  | { kind: 'event'; event: CalendarEvent };

interface Props {
  item?: CalendarItem;
  onOpenChange: (open: boolean) => void;
  /** Hide the teacher's name (when the teacher is the viewer). */
  hideTeacher?: boolean;
  /** Shown for a teacher's class once it has started. */
  attendanceHref?: string;
}

/** Read-only view of a class or event, for teachers and students. */
export function DetailsDialog({
  item,
  onOpenChange,
  hideTeacher,
  attendanceHref,
}: Props) {
  const rows: [string, string | null | undefined][] =
    item?.kind === 'session'
      ? [
          ['When', formatTimeRange(item.session.startsAt, item.session.endsAt)],
          [
            'Module',
            item.session.module &&
              `${item.session.module.code} · ${item.session.module.title}`,
          ],
          ['Venue', item.session.venue],
          ['Teacher', hideTeacher ? null : item.session.teacher.fullName],
          ['Notes', item.session.notes],
        ]
      : item
        ? [
            [
              'When',
              item.event.allDay
                ? formatDayRange(item.event.startsAt, item.event.endsAt)
                : formatTimeRange(item.event.startsAt, item.event.endsAt),
            ],
            [
              'For',
              item.event.batch
                ? `${item.event.batch.course.code} ${item.event.batch.code}`
                : 'Whole academy',
            ],
            ['Details', item.event.description],
          ]
        : [];

  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent>
        {item && (
          <>
            <DialogHeader>
              <DialogTitle>
                {item.kind === 'session'
                  ? `${item.session.batch.course.name} · ${item.session.batch.code}`
                  : item.event.title}
              </DialogTitle>
              <DialogDescription asChild>
                <div>
                  <Badge
                    variant={item.kind === 'session' ? 'default' : 'secondary'}
                  >
                    {item.kind === 'session'
                      ? 'Class'
                      : eventTypeLabels[item.event.type]}
                  </Badge>
                </div>
              </DialogDescription>
            </DialogHeader>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              {rows
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={label} className="contents">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="break-words">{value}</dd>
                  </div>
                ))}
            </dl>
            {attendanceHref && (
              <Button asChild className="min-h-11">
                <Link to={attendanceHref}>
                  <ClipboardCheckIcon /> Take attendance
                </Link>
              </Button>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
