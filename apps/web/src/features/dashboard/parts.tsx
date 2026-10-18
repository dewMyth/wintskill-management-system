import { TriangleAlertIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatTimeRange } from '@/features/calendar/time';
import type { ClassSession } from '@/features/calendar/types';
import { cn } from '@/lib/utils';

/** A headline number: sentence-case label over a semibold value. */
export function StatTile({
  label,
  value,
  to,
}: {
  label: string;
  value: number;
  to?: string;
}) {
  const body = (
    <>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-semibold">
        {value.toLocaleString('en-GB')}
      </p>
    </>
  );
  const className = 'rounded-xl border bg-card p-4';
  return to ? (
    <Link to={to} className={cn(className, 'block min-h-11 hover:bg-muted')}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

/**
 * A ratio against 100%. The fill carries the state (primary, or destructive below `low`);
 * the track is a lighter step of the same colour. Below `low` an icon and text say so too.
 */
export function Meter({
  label,
  value,
  low,
  detail,
}: {
  label: string;
  value: number | null;
  low?: number;
  detail?: string;
}) {
  const isLow = value !== null && low !== undefined && value < low;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="min-w-0 truncate">{label}</span>
        <span
          className={cn('shrink-0 font-semibold', isLow && 'text-destructive')}
        >
          {value === null ? '—' : `${value}%`}
        </span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value ?? 0}
        aria-valuetext={value === null ? 'No data yet' : `${value}%`}
        className={cn(
          'h-2 overflow-hidden rounded-full',
          isLow ? 'bg-destructive/15' : 'bg-primary/15',
        )}
      >
        <div
          className={cn(
            'h-full rounded-full',
            isLow ? 'bg-destructive' : 'bg-primary',
          )}
          style={{ width: `${value ?? 0}%` }}
        />
      </div>
      {(detail || isLow) && (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          {isLow && (
            <span className="flex items-center gap-1 font-medium text-destructive">
              <TriangleAlertIcon className="size-3.5" /> Below {low}%
            </span>
          )}
          {isLow && detail && ' · '}
          {detail}
        </p>
      )}
    </div>
  );
}

export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>
          <h2>{title}</h2>
        </CardTitle>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/** One class as a tappable row: when, intake and module, venue; plus a badge or action. */
export function SessionRow({
  session,
  to,
  aside,
  showTeacher,
}: {
  session: ClassSession;
  to?: string;
  aside?: ReactNode;
  showTeacher?: boolean;
}) {
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">
          {session.batch.course.code} {session.batch.code}
          {session.module && ` · ${session.module.title}`}
        </span>
        <span className="block text-sm text-muted-foreground">
          {formatTimeRange(session.startsAt, session.endsAt)}
          {session.venue && ` · ${session.venue}`}
          {showTeacher && ` · ${session.teacher.fullName}`}
        </span>
      </span>
      {aside}
    </>
  );
  const className = 'flex min-h-14 items-center gap-3 rounded-lg px-3 py-2';
  return to ? (
    <Link to={to} className={cn(className, 'hover:bg-muted')}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

export function MarkedBadge({
  marked,
  attended,
}: {
  marked: number;
  attended: number;
}) {
  return marked === 0 ? (
    <Badge variant="outline">Not marked</Badge>
  ) : (
    <Badge variant="secondary">
      {attended}/{marked} present
    </Badge>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-2 text-sm text-muted-foreground">{children}</p>;
}
