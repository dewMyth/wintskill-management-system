import {
  ArrowLeftIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  PowerIcon,
  Trash2Icon,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ListSkeleton, LoadError } from '@/components/LoadState';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { errorMessage } from '@/services/api';
import { BatchesSection } from './BatchesSection';
import { CourseFormDialog } from './CourseFormDialog';
import {
  useDeleteCourseMutation,
  useGetCourseQuery,
  useUpdateCourseMutation,
} from './courses-api';
import { ModulesSection } from './ModulesSection';
import { ActiveBadge } from './StatusBadge';

export function CourseDetailPage() {
  const { id } = useParams() as { id: string };
  const navigate = useNavigate();
  // currentData: never show the previous record while another one loads.
  const { currentData: course, error, refetch } = useGetCourseQuery(id);
  const [updateCourse] = useUpdateCourseMutation();
  const [deleteCourse] = useDeleteCourseMutation();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const back = (
    <Button asChild variant="ghost" className="mb-2 min-h-11 -ml-3">
      <Link to=".." relative="path">
        <ArrowLeftIcon /> Courses
      </Link>
    </Button>
  );

  if (!course && !error)
    return (
      <>
        {back}
        <ListSkeleton />
      </>
    );
  if (error || !course)
    return (
      <>
        {back}
        <LoadError onRetry={refetch} />
      </>
    );

  const toggleActive = async () => {
    const result = await updateCourse({
      id: course.id,
      isActive: !course.isActive,
    });
    if (result.error) toast.error(errorMessage(result.error));
    else
      toast.success(
        course.isActive ? 'Course deactivated' : 'Course activated',
      );
  };

  const confirmDelete = async () => {
    setDeleting(false);
    const result = await deleteCourse(course.id);
    if (result.error) {
      toast.error(errorMessage(result.error));
      return;
    }
    toast.success(`Course ${course.code} deleted`);
    navigate('..', { relative: 'path', replace: true });
  };

  return (
    <>
      {back}
      <PageHeader
        title={course.name}
        description={course.description ?? undefined}
        actions={
          <>
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => setEditing(true)}
            >
              <PencilIcon /> Edit
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-11"
                  aria-label="More course actions"
                >
                  <EllipsisVerticalIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="min-h-11" onSelect={toggleActive}>
                  <PowerIcon /> {course.isActive ? 'Deactivate' : 'Activate'}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="min-h-11"
                  variant="destructive"
                  onSelect={() => setDeleting(true)}
                >
                  <Trash2Icon /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />
      <div className="mb-4 -mt-3 flex items-center gap-2">
        <span className="font-mono font-semibold">{course.code}</span>
        <ActiveBadge active={course.isActive} />
      </div>

      <Tabs defaultValue="batches">
        <TabsList className="mb-2 w-full sm:w-auto">
          <TabsTrigger value="batches" className="min-h-11 flex-1 sm:flex-none">
            Intakes ({course.batches.length})
          </TabsTrigger>
          <TabsTrigger value="modules" className="min-h-11 flex-1 sm:flex-none">
            Modules ({course.modules.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="batches">
          <BatchesSection course={course} />
        </TabsContent>
        <TabsContent value="modules">
          <ModulesSection course={course} />
        </TabsContent>
      </Tabs>

      <CourseFormDialog
        open={editing}
        onOpenChange={setEditing}
        course={course}
      />
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={`Delete ${course.code}?`}
        description="Only courses without intakes can be deleted; deactivate the course otherwise. This cannot be undone."
        confirmLabel="Delete course"
        destructive
        onConfirm={confirmDelete}
      />
    </>
  );
}
