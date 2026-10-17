import { ArrowLeftIcon, CheckCheckIcon } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { ListSkeleton, LoadError } from '@/components/LoadState';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { formatTimeRange } from '@/features/calendar/time';
import { errorMessage } from '@/services/api';
import {
  useGetAttendanceSheetQuery,
  useSaveAttendanceMutation,
} from './attendance-api';
import { StatusPill } from './StatusPill';
import {
  statusCycle,
  statusLabels,
  type AttendanceSheet,
  type AttendanceStatus,
} from './types';

/** The register for one class: everyone starts as Present; tap a name to change it. */
export function AttendanceSheetPage() {
  const { sessionId } = useParams() as { sessionId: string };
  const {
    currentData: sheet,
    error,
    refetch,
  } = useGetAttendanceSheetQuery(sessionId);

  const back = (
    <Button asChild variant="ghost" className="mb-2 min-h-11 -ml-3">
      <Link to=".." relative="path">
        <ArrowLeftIcon /> Attendance
      </Link>
    </Button>
  );
  if (error)
    return (
      <>
        {back}
        <LoadError onRetry={refetch} />
      </>
    );
  if (!sheet)
    return (
      <>
        {back}
        <ListSkeleton rows={6} />
      </>
    );
  // Remount per session so the local marks start from that session's saved register.
  return <Register key={sheet.session.id} sheet={sheet} back={back} />;
}

function Register({
  sheet,
  back,
}: {
  sheet: AttendanceSheet;
  back: React.ReactNode;
}) {
  const navigate = useNavigate();
  const [saveAttendance, { isLoading: saving }] = useSaveAttendanceMutation();
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>(() =>
    Object.fromEntries(
      sheet.roster.map((r) => [r.enrollmentId, r.status ?? 'PRESENT']),
    ),
  );
  const { session, roster, started } = sheet;
  const neverSaved = roster.every((r) => r.status === null);
  const changed = roster.filter(
    (r) => r.status !== marks[r.enrollmentId],
  ).length;
  const counts = statusCycle.map(
    (s) =>
      [s, roster.filter((r) => marks[r.enrollmentId] === s).length] as const,
  );

  const cycle = (enrollmentId: string) =>
    setMarks((m) => ({
      ...m,
      [enrollmentId]:
        statusCycle[
          (statusCycle.indexOf(m[enrollmentId]) + 1) % statusCycle.length
        ],
    }));

  const save = async () => {
    const result = await saveAttendance({
      sessionId: session.id,
      records: roster.map((r) => ({
        enrollmentId: r.enrollmentId,
        status: marks[r.enrollmentId],
      })),
    });
    if (result.error) return toast.error(errorMessage(result.error));
    toast.success('Attendance saved');
    navigate('..', { relative: 'path' });
  };

  return (
    <div className="pb-24">
      {back}
      <PageHeader
        title={`${session.batch.course.code} ${session.batch.code}${session.module ? ` · ${session.module.title}` : ''}`}
        description={`${formatTimeRange(session.startsAt, session.endsAt)}${session.venue ? ` · ${session.venue}` : ''} · ${session.teacher.fullName}`}
      />

      {!started ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">
          This class has not started yet. Attendance can be taken once it
          begins.
        </p>
      ) : roster.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">
          No students are enrolled in this intake.
        </p>
      ) : (
        <>
          <div
            className="mb-3 flex flex-wrap items-center gap-2 text-sm"
            aria-live="polite"
          >
            {counts.map(([status, n]) => (
              <Badge key={status} variant="outline">
                {statusLabels[status]} {n}
              </Badge>
            ))}
            {neverSaved && <Badge variant="secondary">Not saved yet</Badge>}
          </div>
          <p className="mb-3 text-sm text-muted-foreground">
            Tap a student to change: Present → Absent → Late → Excused.
          </p>
          <ul className="divide-y rounded-xl border bg-card">
            {roster.map((r) => (
              <li key={r.enrollmentId}>
                <button
                  type="button"
                  className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left active:bg-muted"
                  onClick={() => cycle(r.enrollmentId)}
                  aria-label={`${r.fullName}: ${statusLabels[marks[r.enrollmentId]]}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {r.fullName}
                    </span>
                    <span className="block font-mono text-xs text-muted-foreground">
                      {r.registrationNo}
                      {r.enrollmentStatus !== 'ACTIVE' &&
                        ` · ${r.enrollmentStatus.toLowerCase()}`}
                    </span>
                  </span>
                  <StatusPill status={marks[r.enrollmentId]} />
                </button>
              </li>
            ))}
          </ul>

          <div className="fixed inset-x-0 bottom-14 z-20 border-t bg-background/95 p-3 backdrop-blur md:sticky md:bottom-0 md:mt-4 md:rounded-xl md:border">
            <div className="mx-auto flex max-w-3xl gap-2">
              <Button
                variant="outline"
                className="min-h-11"
                onClick={() =>
                  setMarks(
                    Object.fromEntries(
                      roster.map((r) => [r.enrollmentId, 'PRESENT']),
                    ),
                  )
                }
              >
                <CheckCheckIcon /> All present
              </Button>
              <Button
                className="min-h-11 flex-1"
                onClick={save}
                disabled={saving || (!neverSaved && changed === 0)}
              >
                {saving && <Spinner />}
                {neverSaved
                  ? 'Save attendance'
                  : changed
                    ? `Save ${changed} change${changed === 1 ? '' : 's'}`
                    : 'Saved'}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
