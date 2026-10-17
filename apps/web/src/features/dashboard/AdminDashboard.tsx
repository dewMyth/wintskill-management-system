import {
  CalendarPlusIcon,
  ClipboardCheckIcon,
  TriangleAlertIcon,
  UserPlusIcon,
} from 'lucide-react';
import { Link } from 'react-router';
import { ListSkeleton, LoadError } from '@/components/LoadState';
import { Button } from '@/components/ui/button';
import { useGetAdminDashboardQuery } from './dashboard-api';
import {
  Empty,
  MarkedBadge,
  Meter,
  Section,
  SessionRow,
  StatTile,
} from './parts';

export function AdminDashboard() {
  const { data, error, refetch } = useGetAdminDashboardQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  if (error) return <LoadError onRetry={refetch} />;
  if (!data) return <ListSkeleton />;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Active students"
          value={data.counts.activeStudents}
          to="/admin/students"
        />
        <StatTile
          label="Open intakes"
          value={data.counts.openIntakes}
          to="/admin/courses"
        />
        <StatTile
          label="Teachers"
          value={data.counts.teachers}
          to="/admin/teachers"
        />
        <StatTile
          label="Courses"
          value={data.counts.courses}
          to="/admin/courses"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild className="min-h-11">
          <Link to="/admin/students/new">
            <UserPlusIcon /> Register student
          </Link>
        </Button>
        <Button asChild variant="outline" className="min-h-11">
          <Link to="/admin/calendar">
            <CalendarPlusIcon /> Plan classes
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Today's classes">
          {data.today.length === 0 ? (
            <Empty>No classes today.</Empty>
          ) : (
            <div className="-mx-3 flex flex-col">
              {data.today.map((s) => (
                <SessionRow
                  key={s.id}
                  session={s}
                  showTeacher
                  to={`/admin/attendance/${s.id}`}
                  aside={
                    <MarkedBadge marked={s.marked} attended={s.attended} />
                  }
                />
              ))}
            </div>
          )}
        </Section>

        <Section title="Needs attention">
          <div className="flex flex-col gap-3">
            {data.unmarkedRecently > 0 ? (
              <Link
                to="/admin/attendance"
                className="flex min-h-11 items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm"
              >
                <ClipboardCheckIcon className="size-4 shrink-0" />
                <span>
                  <strong>{data.unmarkedRecently}</strong> class
                  {data.unmarkedRecently === 1 ? '' : 'es'} in the last two
                  weeks {data.unmarkedRecently === 1 ? 'has' : 'have'} no
                  attendance yet
                </span>
              </Link>
            ) : (
              <Empty>All recent classes have attendance.</Empty>
            )}
            <h3 className="flex items-center gap-1 text-sm font-medium">
              <TriangleAlertIcon className="size-4 text-destructive" />{' '}
              Attendance below {data.threshold}%
            </h3>
            {data.lowAttendance.length === 0 ? (
              <Empty>No students below {data.threshold}%.</Empty>
            ) : (
              <ul className="-mx-3 flex flex-col">
                {data.lowAttendance.map((s) => (
                  <li key={s.registrationNo}>
                    <Link
                      to={`/admin/students/${s.studentId}`}
                      className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{s.fullName}</span>
                        <span className="block font-mono text-xs text-muted-foreground">
                          {s.registrationNo}
                        </span>
                      </span>
                      <span className="font-semibold text-destructive">
                        {s.percentage}%
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Section>
      </div>

      <Section title="Open intakes">
        {data.batches.length === 0 ? (
          <Empty>No open intakes. Start one from Courses.</Empty>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.batches.map((b) => (
              <li key={b.id} className="rounded-lg border p-3">
                <Link
                  to={`/admin/courses/${b.course.id}`}
                  className="block min-h-11"
                >
                  <p className="font-medium">
                    {b.course.code} {b.code}
                    {b.status === 'PLANNED' && (
                      <span className="text-sm text-muted-foreground">
                        {' '}
                        · planned
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {b.course.name} · {b.students} student
                    {b.students === 1 ? '' : 's'}
                  </p>
                </Link>
                <div className="mt-2">
                  <Meter
                    label="Attendance"
                    value={b.attendance}
                    low={data.threshold}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
