import {
  ArrowDownIcon,
  ArrowUpIcon,
  LayersIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/services/api';
import {
  useDeleteModuleMutation,
  useReorderModulesMutation,
} from './courses-api';
import { ModuleFormDialog } from './ModuleFormDialog';
import type { CourseDetail, CourseModule } from './types';

export function ModulesSection({ course }: { course: CourseDetail }) {
  const { modules } = course;
  const totalHours = modules.reduce((sum, m) => sum + (m.hours ?? 0), 0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CourseModule>();
  const [deleting, setDeleting] = useState<CourseModule>();
  const [deleteModule] = useDeleteModuleMutation();
  const [reorderModules, { isLoading: reordering }] =
    useReorderModulesMutation();

  const openForm = (module?: CourseModule) => {
    setEditing(module);
    setFormOpen(true);
  };

  const move = async (index: number, by: -1 | 1) => {
    const ids = modules.map((m) => m.id);
    [ids[index], ids[index + by]] = [ids[index + by], ids[index]];
    const result = await reorderModules({
      courseId: course.id,
      moduleIds: ids,
    });
    if (result.error) toast.error(errorMessage(result.error));
  };

  const confirmDelete = async () => {
    const result = await deleteModule({
      courseId: course.id,
      id: deleting!.id,
    });
    if (result.error) toast.error(errorMessage(result.error));
    else toast.success(`Module ${deleting!.code} deleted`);
    setDeleting(undefined);
  };

  const addButton = (
    <Button className="min-h-11" onClick={() => openForm()}>
      <PlusIcon /> Add module
    </Button>
  );

  return (
    <section className="flex flex-col gap-4">
      {modules.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {modules.length} module{modules.length === 1 ? '' : 's'}
            {totalHours > 0 && ` · ${totalHours} hours`}
          </p>
          {addButton}
        </div>
      )}
      {modules.length === 0 ? (
        <EmptyState
          icon={LayersIcon}
          title="No modules yet"
          description="Modules hold the course materials and assignments."
          action={addButton}
        />
      ) : (
        <ol className="divide-y rounded-xl border bg-card">
          {modules.map((module, index) => (
            <li
              key={module.id}
              className="flex flex-col gap-1 py-2 pr-2 pl-4 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-start gap-2 pt-1 sm:items-center sm:pt-0">
                <Badge variant="outline" className="font-mono">
                  {module.code}
                </Badge>
                <span className="min-w-0 break-words">
                  {module.title}
                  {module.hours != null && (
                    <span className="text-sm whitespace-nowrap text-muted-foreground">
                      {' '}
                      · {module.hours} h
                    </span>
                  )}
                </span>
              </div>
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11"
                  aria-label={`Move ${module.code} up`}
                  disabled={index === 0 || reordering}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUpIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11"
                  aria-label={`Move ${module.code} down`}
                  disabled={index === modules.length - 1 || reordering}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDownIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11"
                  aria-label={`Edit ${module.code}`}
                  onClick={() => openForm(module)}
                >
                  <PencilIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11 text-destructive"
                  aria-label={`Delete ${module.code}`}
                  onClick={() => setDeleting(module)}
                >
                  <Trash2Icon />
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}
      <ModuleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        courseId={course.id}
        module={editing}
        suggestedCode={`M${String(modules.length + 1).padStart(2, '0')}`}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(undefined)}
        title={`Delete module ${deleting?.code}?`}
        description="Modules with materials or classes cannot be deleted. This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
      />
    </section>
  );
}
