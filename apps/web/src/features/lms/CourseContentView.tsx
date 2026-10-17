import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckCircle2Icon,
  FileTextIcon,
  ImageIcon,
  NotebookPenIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  VideoIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { useAppSelector } from '@/app/store';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ListSkeleton, LoadError } from '@/components/LoadState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/format';
import { errorMessage } from '@/services/api';
import {
  useDeleteAssignmentMutation,
  useDeleteMaterialMutation,
  useGetCourseContentQuery,
  useReorderMaterialsMutation,
} from './lms-api';
import { AssignmentDialog, MaterialDialog } from './MaterialDialogs';
import {
  kindLabels,
  type Assignment,
  type CourseContent,
  type Material,
  type MaterialKind,
} from './types';

const kindIcons: Record<MaterialKind, typeof FileTextIcon> = {
  PDF: FileTextIcon,
  VIDEO: VideoIcon,
  IMAGE: ImageIcon,
};

type Dialog =
  | { kind: 'material'; moduleId: string; material?: Material }
  | { kind: 'assignment'; moduleId: string; assignment?: Assignment }
  | { kind: 'delete-material'; material: Material }
  | { kind: 'delete-assignment'; assignment: Assignment };

/** A course's modules with materials and assignments; `manage` adds staff controls. */
export function CourseContentView({
  courseId,
  manage,
}: {
  courseId: string;
  manage: boolean;
}) {
  const role = useAppSelector((s) => s.auth.user!.role);
  const {
    currentData: course,
    error,
    refetch,
  } = useGetCourseContentQuery(courseId);
  const [dialog, setDialog] = useState<Dialog>();
  const [reorder, { isLoading: reordering }] = useReorderMaterialsMutation();
  const [deleteMaterial] = useDeleteMaterialMutation();
  const [deleteAssignment] = useDeleteAssignmentMutation();
  const viewPath = (type: 'material' | 'assignment', id: string) =>
    `/${role.toLowerCase()}/view/${type}/${id}`;

  if (error) return <LoadError onRetry={refetch} />;
  if (!course) return <ListSkeleton />;

  const move = async (
    module: CourseContent['modules'][number],
    index: number,
    by: -1 | 1,
  ) => {
    const ids = module.materials.map((m) => m.id);
    [ids[index], ids[index + by]] = [ids[index + by], ids[index]];
    const result = await reorder({ moduleId: module.id, materialIds: ids });
    if (result.error) toast.error(errorMessage(result.error));
  };

  const confirmDelete = async () => {
    if (dialog?.kind === 'delete-material') {
      const result = await deleteMaterial(dialog.material.id);
      if (result.error) toast.error(errorMessage(result.error));
      else toast.success('Material deleted');
    } else if (dialog?.kind === 'delete-assignment') {
      const result = await deleteAssignment(dialog.assignment.id);
      if (result.error) toast.error(errorMessage(result.error));
      else toast.success('Assignment deleted');
    }
    setDialog(undefined);
  };

  if (course.modules.length === 0) {
    return (
      <p className="text-muted-foreground">This course has no modules yet.</p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {course.modules.map((module) => (
        <Card key={module.id}>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle>
              <h2 className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono">
                  {module.code}
                </Badge>
                {module.title}
              </h2>
            </CardTitle>
            {manage && (
              <div className="flex flex-wrap gap-2">
                <Button
                  className="min-h-11"
                  onClick={() =>
                    setDialog({ kind: 'material', moduleId: module.id })
                  }
                >
                  <PlusIcon /> Material
                </Button>
                <Button
                  variant="outline"
                  className="min-h-11"
                  onClick={() =>
                    setDialog({ kind: 'assignment', moduleId: module.id })
                  }
                >
                  <PlusIcon /> Assignment
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {module.materials.length === 0 &&
              module.assignments.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nothing here yet.
                </p>
              )}
            {module.materials.length > 0 && (
              <ul className="divide-y rounded-lg border">
                {module.materials.map((m, index) => {
                  const Icon = kindIcons[m.kind];
                  return (
                    <li
                      key={m.id}
                      className="flex flex-col gap-1 sm:flex-row sm:items-center"
                    >
                      <Link
                        to={viewPath('material', m.id)}
                        className="flex min-h-14 min-w-0 flex-1 items-center gap-3 px-3 py-2 hover:bg-muted"
                      >
                        <Icon className="size-5 shrink-0 text-primary" />
                        <span className="min-w-0 flex-1">
                          <span className="block break-words font-medium">
                            {m.title}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {kindLabels[m.kind]} · {m.uploadedBy}
                          </span>
                        </span>
                        {!manage && m.viewed && (
                          <CheckCircle2Icon
                            className="size-5 shrink-0 text-primary"
                            aria-label="Viewed"
                          />
                        )}
                      </Link>
                      {manage && (
                        <div className="flex justify-end px-1 pb-1 sm:pb-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-11"
                            aria-label={`Move ${m.title} up`}
                            disabled={index === 0 || reordering}
                            onClick={() => move(module, index, -1)}
                          >
                            <ArrowUpIcon />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-11"
                            aria-label={`Move ${m.title} down`}
                            disabled={
                              index === module.materials.length - 1 ||
                              reordering
                            }
                            onClick={() => move(module, index, 1)}
                          >
                            <ArrowDownIcon />
                          </Button>
                          {m.canEdit && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-11"
                                aria-label={`Rename ${m.title}`}
                                onClick={() =>
                                  setDialog({
                                    kind: 'material',
                                    moduleId: module.id,
                                    material: m,
                                  })
                                }
                              >
                                <PencilIcon />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-11 text-destructive"
                                aria-label={`Delete ${m.title}`}
                                onClick={() =>
                                  setDialog({
                                    kind: 'delete-material',
                                    material: m,
                                  })
                                }
                              >
                                <Trash2Icon />
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {module.assignments.map((a) => (
              <div
                key={a.id}
                className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <NotebookPenIcon className="size-5 text-primary" />
                  <span className="font-medium">{a.title}</span>
                  {a.dueAt && (
                    <Badge variant="secondary">Due {formatDate(a.dueAt)}</Badge>
                  )}
                </div>
                {a.description && (
                  <p className="text-sm whitespace-pre-line">{a.description}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {a.hasFile && (
                    <Button asChild variant="outline" className="min-h-11">
                      <Link to={viewPath('assignment', a.id)}>
                        <FileTextIcon /> Open file
                      </Link>
                    </Button>
                  )}
                  {manage && a.canEdit && (
                    <>
                      <Button
                        variant="ghost"
                        className="min-h-11"
                        onClick={() =>
                          setDialog({
                            kind: 'assignment',
                            moduleId: module.id,
                            assignment: a,
                          })
                        }
                      >
                        <PencilIcon /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        className="min-h-11 text-destructive"
                        onClick={() =>
                          setDialog({
                            kind: 'delete-assignment',
                            assignment: a,
                          })
                        }
                      >
                        <Trash2Icon /> Delete
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {dialog?.kind === 'material' && (
        <MaterialDialog
          open
          onOpenChange={(open) => !open && setDialog(undefined)}
          moduleId={dialog.moduleId}
          material={dialog.material}
        />
      )}
      {dialog?.kind === 'assignment' && (
        <AssignmentDialog
          open
          onOpenChange={(open) => !open && setDialog(undefined)}
          moduleId={dialog.moduleId}
          assignment={dialog.assignment}
        />
      )}
      <ConfirmDialog
        open={
          dialog?.kind === 'delete-material' ||
          dialog?.kind === 'delete-assignment'
        }
        onOpenChange={(open) => !open && setDialog(undefined)}
        title={
          dialog?.kind === 'delete-material'
            ? `Delete "${dialog.material.title}"?`
            : dialog?.kind === 'delete-assignment'
              ? `Delete "${dialog.assignment.title}"?`
              : ''
        }
        description="The file is removed for everyone. This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
      />
    </div>
  );
}
