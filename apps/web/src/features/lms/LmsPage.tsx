import { BookOpenIcon } from 'lucide-react';
import { useState } from 'react';
import { useAppSelector } from '@/app/store';
import { EmptyState } from '@/components/EmptyState';
import { ListSkeleton, LoadError } from '@/components/LoadState';
import { PageHeader } from '@/components/PageHeader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CourseContentView } from './CourseContentView';
import { useGetLmsCoursesQuery } from './lms-api';

/** Staff: "Materials" (upload and manage). Students: "Learn" (their courses, view-only). */
export function LmsPage() {
  const isStudent = useAppSelector((s) => s.auth.user!.role) === 'STUDENT';
  const { data: courses, isLoading, error, refetch } = useGetLmsCoursesQuery();
  const [chosen, setChosen] = useState<string>();
  const courseId = chosen ?? courses?.[0]?.courseId;

  return (
    <>
      <PageHeader
        title={isStudent ? 'Learn' : 'Materials'}
        description={
          isStudent
            ? 'Course materials and assignments.'
            : 'Upload and organise course materials.'
        }
      />
      {isLoading ? (
        <ListSkeleton />
      ) : error || !courses ? (
        <LoadError onRetry={refetch} />
      ) : courses.length === 0 || !courseId ? (
        <EmptyState
          icon={BookOpenIcon}
          title={isStudent ? 'No active courses' : 'No active courses yet'}
          description={
            isStudent
              ? 'Your course materials appear here once you are enrolled.'
              : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {courses.length > 1 && (
            <Select value={courseId} onValueChange={setChosen}>
              <SelectTrigger className="w-full sm:w-96" aria-label="Course">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem
                    key={c.courseId}
                    value={c.courseId}
                    className="min-h-11"
                  >
                    {c.code} · {c.name}
                    {c.registrationNo && ` (${c.registrationNo})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <CourseContentView
            key={courseId}
            courseId={courseId}
            manage={!isStudent}
          />
        </div>
      )}
    </>
  );
}
