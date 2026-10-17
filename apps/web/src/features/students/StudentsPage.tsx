import { SearchIcon, UserPlusIcon, UsersIcon } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { DataTable } from '@/components/DataTable';
import { EmptyState } from '@/components/EmptyState';
import { ListSkeleton, LoadError } from '@/components/LoadState';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGetCoursesQuery } from '@/features/courses/courses-api';
import { useDebounced } from '@/lib/use-debounced';
import { useGetStudentsQuery } from './students-api';

const ALL = 'all';

export function StudentsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const courseId = params.get('course') ?? ALL;
  const page = Number(params.get('page') ?? 1);
  const search = params.get('q') ?? '';
  const debouncedSearch = useDebounced(search.trim());

  // Keep filters in the URL so "back" from a student returns to the same list.
  const update = (changes: Record<string, string | undefined>) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(changes)) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
        return next;
      },
      { replace: true },
    );

  const { data: courses } = useGetCoursesQuery();
  const { data, isLoading, isFetching, error, refetch } = useGetStudentsQuery({
    search: debouncedSearch || undefined,
    courseId: courseId === ALL ? undefined : courseId,
    page,
  });
  const lastPage = data
    ? Math.max(1, Math.ceil(data.total / data.pageSize))
    : 1;

  const registerButton = (
    <Button asChild className="min-h-11">
      <Link to="new">
        <UserPlusIcon /> Register student
      </Link>
    </Button>
  );

  return (
    <>
      <PageHeader title="Students" actions={registerButton} />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Search students"
            placeholder="Name, NIC, reg. no. or phone"
            className="h-11 pl-9"
            value={search}
            onChange={(e) =>
              update({ q: e.target.value || undefined, page: undefined })
            }
          />
        </div>
        <Select
          value={courseId}
          onValueChange={(v) =>
            update({ course: v === ALL ? undefined : v, page: undefined })
          }
        >
          <SelectTrigger
            className="h-11 w-full sm:w-64"
            aria-label="Filter by course"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL} className="min-h-11">
              All courses
            </SelectItem>
            {courses?.map((c) => (
              <SelectItem key={c.id} value={c.id} className="min-h-11">
                {c.code} · {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <ListSkeleton />
      ) : error || !data ? (
        <LoadError onRetry={refetch} />
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title={
            debouncedSearch || courseId !== ALL
              ? 'No matching students'
              : 'No students yet'
          }
          description={
            debouncedSearch || courseId !== ALL
              ? 'Try another search or course.'
              : 'Register the first student.'
          }
          action={
            !debouncedSearch && courseId === ALL ? registerButton : undefined
          }
        />
      ) : (
        <div
          className={isFetching ? 'opacity-60 transition-opacity' : undefined}
        >
          <DataTable
            rows={data.items}
            getRowId={(s) => s.id}
            onRowClick={(s) => navigate(s.id)}
            columns={[
              {
                header: 'Student',
                cell: (s) => (
                  <span className="flex flex-wrap items-center gap-2">
                    {s.fullName}
                    {!s.isActive && <Badge variant="secondary">Inactive</Badge>}
                  </span>
                ),
              },
              {
                header: 'Registration',
                cell: (s) => (
                  <span className="flex flex-wrap gap-1">
                    {s.enrollments.map((e) => (
                      <Badge key={e.id} variant="outline" className="font-mono">
                        {e.registrationNo}
                      </Badge>
                    ))}
                  </span>
                ),
              },
              {
                header: 'NIC / passport',
                cell: (s) => (
                  <span className="font-mono">{s.nicOrPassport}</span>
                ),
              },
              { header: 'Mobile', cell: (s) => s.mobilePhone },
            ]}
          />
          <nav
            aria-label="Pages"
            className="mt-4 flex items-center justify-between gap-2 text-sm"
          >
            <Button
              variant="outline"
              className="min-h-11"
              disabled={page <= 1}
              onClick={() => update({ page: String(page - 1) })}
            >
              Previous
            </Button>
            <span className="text-muted-foreground">
              {(page - 1) * data.pageSize + 1}–
              {Math.min(page * data.pageSize, data.total)} of {data.total}
            </span>
            <Button
              variant="outline"
              className="min-h-11"
              disabled={page >= lastPage}
              onClick={() => update({ page: String(page + 1) })}
            >
              Next
            </Button>
          </nav>
        </div>
      )}
    </>
  );
}
