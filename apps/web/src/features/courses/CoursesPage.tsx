import { BookOpenIcon, PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { DataTable } from '@/components/DataTable';
import { EmptyState } from '@/components/EmptyState';
import { ListSkeleton, LoadError } from '@/components/LoadState';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { CourseFormDialog } from './CourseFormDialog';
import { useGetCoursesQuery } from './courses-api';
import { ActiveBadge } from './StatusBadge';

export function CoursesPage() {
  const { data: courses, isLoading, error, refetch } = useGetCoursesQuery();
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const newButton = (
    <Button className="min-h-11" onClick={() => setCreating(true)}>
      <PlusIcon /> New course
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Courses"
        description="Courses, their modules and batch intakes."
        actions={newButton}
      />
      {isLoading ? (
        <ListSkeleton />
      ) : error || !courses ? (
        <LoadError onRetry={refetch} />
      ) : courses.length === 0 ? (
        <EmptyState
          icon={BookOpenIcon}
          title="No courses yet"
          description="Create your first course, then add its modules and start an intake."
          action={newButton}
        />
      ) : (
        <DataTable
          rows={courses}
          getRowId={(c) => c.id}
          onRowClick={(c) => navigate(c.id)}
          columns={[
            {
              header: 'Course',
              cell: (c) => (
                <span>
                  <span className="font-mono font-semibold">{c.code}</span> ·{' '}
                  {c.name}
                </span>
              ),
            },
            { header: 'Modules', cell: (c) => c.moduleCount },
            { header: 'Intakes', cell: (c) => c.batchCount },
            {
              header: 'Status',
              cell: (c) => <ActiveBadge active={c.isActive} />,
            },
          ]}
        />
      )}
      <CourseFormDialog
        open={creating}
        onOpenChange={setCreating}
        onCreated={(c) => navigate(c.id)}
      />
    </>
  );
}
