import {
  BookOpenIcon,
  CalendarClockIcon,
  LibraryIcon,
  NotebookPenIcon,
} from 'lucide-react';
import { Link } from 'react-router';
import { EmptyState } from '@/components/EmptyState';
import { ListSkeleton, LoadError } from '@/components/LoadState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatTimeRange } from '@/features/calendar/time';
import { formatDate } from '@/lib/format';
import { useGetStudentDashboardQuery } from './dashboard-api';
import { Empty, Meter, Section } from './parts';

export function StudentDashboard() {
  const { data, error, refetch } = useGetStudentDashboardQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  if (error) return <LoadError onRetry={refetch} />;
  if (!data) return <ListSkeleton />;
  if (data.courses.length === 0) {
    return (
      <EmptyState
        icon={BookOpenIcon}
        title="No active courses"
        description="Contact the academy office."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {data.courses.map((c) => (
        <Section
          key={c.enrollmentId}
          title={c.course.name}
          action={
            <Badge variant="outline" className="font-mono">
              {c.registrationNo}
            </Badge>
          }
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="mb-1 flex items-center gap-2 text-sm font-medium">
                  <CalendarClockIcon className="size-4" /> Next class
                </h3>
                {c.nextClass ? (
                  <p>
                    {formatTimeRange(c.nextClass.startsAt, c.nextClass.endsAt)}
                    <span className="block text-sm text-muted-foreground">
                      {[c.nextClass.module?.title, c.nextClass.venue]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </p>
                ) : (
                  <Empty>No upcoming classes.</Empty>
                )}
              </div>
              <Meter
                label="Attendance"
                value={c.attendance.percentage}
                low={data.threshold}
                detail={`${c.attendance.present} present · ${c.attendance.late} late · ${c.attendance.absent} absent · ${c.attendance.excused} excused`}
              />
              <div>
                <h3 className="mb-1 flex items-center gap-2 text-sm font-medium">
                  <NotebookPenIcon className="size-4" /> Assignments due
                </h3>
                {c.upcomingAssignments.length === 0 ? (
                  <Empty>Nothing due.</Empty>
                ) : (
                  <ul className="flex flex-col gap-1 text-sm">
                    {c.upcomingAssignments.map((a) => (
                      <li key={a.id} className="flex justify-between gap-2">
                        <span className="min-w-0 truncate">
                          {a.title}{' '}
                          <span className="text-muted-foreground">
                            ({a.module.code})
                          </span>
                        </span>
                        <span className="shrink-0 text-muted-foreground">
                          {formatDate(a.dueAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-medium">Materials viewed</h3>
              {c.modules.map((m) => (
                <Meter
                  key={m.id}
                  label={`${m.code} · ${m.title}`}
                  value={
                    m.total ? Math.round((m.viewed / m.total) * 100) : null
                  }
                  detail={
                    m.total ? `${m.viewed} of ${m.total}` : 'No materials yet'
                  }
                />
              ))}
              <Button asChild variant="outline" className="min-h-11 self-start">
                <Link to="/student/learn">
                  <LibraryIcon /> Open materials
                </Link>
              </Button>
            </div>
          </div>
        </Section>
      ))}
    </div>
  );
}
