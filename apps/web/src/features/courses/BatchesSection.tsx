import {
  CalendarPlusIcon,
  PencilIcon,
  Trash2Icon,
  UsersIcon,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate } from '@/lib/format';
import { errorMessage } from '@/services/api';
import { BatchFormDialog } from './BatchFormDialog';
import { useDeleteBatchMutation } from './courses-api';
import { BatchStatusBadge } from './StatusBadge';
import type { Batch, CourseDetail } from './types';

export function BatchesSection({ course }: { course: CourseDetail }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Batch>();
  const [deleting, setDeleting] = useState<Batch>();
  const [deleteBatch] = useDeleteBatchMutation();

  const openForm = (batch?: Batch) => {
    setEditing(batch);
    setFormOpen(true);
  };

  const confirmDelete = async () => {
    const result = await deleteBatch({ courseId: course.id, id: deleting!.id });
    if (result.error) toast.error(errorMessage(result.error));
    else toast.success(`Intake ${deleting!.code} deleted`);
    setDeleting(undefined);
  };

  const startButton = (
    <Button className="min-h-11" onClick={() => openForm()}>
      <CalendarPlusIcon /> Start new intake
    </Button>
  );

  return (
    <section className="flex flex-col gap-4">
      <div className="flex justify-end">
        {course.batches.length > 0 && startButton}
      </div>
      {course.batches.length === 0 ? (
        <EmptyState
          icon={CalendarPlusIcon}
          title="No intakes yet"
          description="Start an intake to begin registering students for this course."
          action={startButton}
        />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {course.batches.map((batch) => (
            <li key={batch.id}>
              <Card className="py-4">
                <CardContent className="flex flex-col gap-3 px-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono font-semibold">
                        {course.code}/{batch.code}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {batch.name}
                      </p>
                    </div>
                    <BatchStatusBadge status={batch.status} />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <span>
                      {formatDate(batch.startDate)}
                      {batch.endDate && ` – ${formatDate(batch.endDate)}`}
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <UsersIcon className="size-4" /> {batch.enrollmentCount}{' '}
                      students
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="min-h-11 flex-1 sm:flex-none"
                      onClick={() => openForm(batch)}
                    >
                      <PencilIcon /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-11 text-destructive"
                      aria-label={`Delete intake ${batch.code}`}
                      onClick={() => setDeleting(batch)}
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <BatchFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        course={course}
        batch={editing}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(undefined)}
        title={`Delete intake ${deleting?.code}?`}
        description="Only intakes without students can be deleted. This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
      />
    </section>
  );
}
