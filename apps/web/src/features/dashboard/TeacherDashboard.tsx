import { CalendarDaysIcon, LibraryIcon } from 'lucide-react';
import { Link } from 'react-router';
import { ListSkeleton, LoadError } from '@/components/LoadState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useGetTeacherDashboardQuery } from './dashboard-api';
import { Empty, MarkedBadge, Section, SessionRow } from './parts';

export function TeacherDashboard() {
  const { data, error, refetch } = useGetTeacherDashboardQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  if (error) return <LoadError onRetry={refetch} />;
  if (!data) return <ListSkeleton />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button asChild className="min-h-11">
          <Link to="/teacher/materials">
            <LibraryIcon /> Upload materials
          </Link>
        </Button>
        <Button asChild variant="outline" className="min-h-11">
          <Link to="/teacher/calendar">
            <CalendarDaysIcon /> My calendar
          </Link>
        </Button>
      </div>

      {data.awaitingAttendance.length > 0 && (
        <Section title="Waiting for attendance">
          <div className="-mx-3 flex flex-col">
            {data.awaitingAttendance.map((s) => (
              <SessionRow
                key={s.id}
                session={s}
                to={`/teacher/attendance/${s.id}`}
                aside={<Badge variant="destructive">Take attendance</Badge>}
              />
            ))}
          </div>
        </Section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Today">
          {data.today.length === 0 ? (
            <Empty>No classes today.</Empty>
          ) : (
            <div className="-mx-3 flex flex-col">
              {data.today.map((s) => (
                <SessionRow
                  key={s.id}
                  session={s}
                  to={`/teacher/attendance/${s.id}`}
                  aside={
                    <MarkedBadge marked={s.marked} attended={s.attended} />
                  }
                />
              ))}
            </div>
          )}
        </Section>
        <Section title="Coming up">
          {data.upcoming.length === 0 ? (
            <Empty>Nothing scheduled.</Empty>
          ) : (
            <div className="-mx-3 flex flex-col">
              {data.upcoming.map((s) => (
                <SessionRow key={s.id} session={s} />
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
