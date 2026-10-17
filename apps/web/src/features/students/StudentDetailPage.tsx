import { ArrowLeftIcon, PencilIcon, PlusIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import { ListSkeleton, LoadError } from '@/components/LoadState';
import { PhotoPicker } from '@/components/PhotoPicker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AccountActions } from '@/features/accounts/AccountActions';
import { useUploadPhotoMutation } from '@/features/accounts/accounts-api';
import { formatDate } from '@/lib/format';
import { errorMessage } from '@/services/api';
import { EnrollDialog } from './EnrollDialog';
import {
  useGetStudentQuery,
  useUpdateEnrollmentMutation,
} from './students-api';
import {
  enrollmentStatusLabels,
  type EnrollmentStatus,
  type Qualification,
} from './types';

function Details({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-[auto_1fr]">
      {items.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="-mt-2 break-words sm:mt-0">{value || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

function QualificationTable({
  title,
  q,
}: {
  title: string;
  q?: Qualification;
}) {
  if (!q) return null;
  return (
    <div>
      <h3 className="mb-2 font-medium">
        {title} · {q.year}
        {q.indexNo && (
          <span className="text-muted-foreground"> · Index {q.indexNo}</span>
        )}
      </h3>
      {q.subjects.length > 0 && (
        <table className="w-full text-sm">
          <tbody>
            {q.subjects.map((s) => (
              <tr key={s.subject} className="border-b last:border-0">
                <td className="py-1.5">{s.subject}</td>
                <td className="py-1.5 text-right font-mono">{s.result}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function StudentDetailPage() {
  const { id } = useParams() as { id: string };
  const { data: student, isLoading, error, refetch } = useGetStudentQuery(id);
  const [uploadPhoto, { isLoading: uploading }] = useUploadPhotoMutation();
  const [updateEnrollment] = useUpdateEnrollmentMutation();
  const [enrolling, setEnrolling] = useState(false);

  const back = (
    <Button asChild variant="ghost" className="mb-2 min-h-11 -ml-3">
      <Link to=".." relative="path">
        <ArrowLeftIcon /> Students
      </Link>
    </Button>
  );
  if (isLoading)
    return (
      <>
        {back}
        <ListSkeleton />
      </>
    );
  if (error || !student)
    return (
      <>
        {back}
        <LoadError onRetry={refetch} />
      </>
    );

  const changePhoto = async (file: File) => {
    const result = await uploadPhoto({ profileId: student.profileId, file });
    if (result.error) toast.error(errorMessage(result.error));
    else toast.success('Photo updated');
  };

  const changeStatus = async (
    enrollmentId: string,
    status: EnrollmentStatus,
  ) => {
    const result = await updateEnrollment({
      studentId: student.id,
      id: enrollmentId,
      status,
    });
    if (result.error) toast.error(errorMessage(result.error));
    else toast.success('Enrollment updated');
  };

  return (
    <>
      {back}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-3">
          <PhotoPicker
            name={student.fullName}
            photoUrl={student.avatarUrl}
            busy={uploading}
            onChange={changePhoto}
          />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {student.fullName}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-muted-foreground">
              Signs in as{' '}
              <span className="font-mono text-foreground">
                {student.username}
              </span>
              {!student.isActive && (
                <Badge variant="secondary">Login deactivated</Badge>
              )}
              {student.mustChangePassword && (
                <Badge variant="outline">Has temporary password</Badge>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" className="min-h-11">
            <Link to="edit">
              <PencilIcon /> Edit
            </Link>
          </Button>
          <AccountActions
            profileId={student.profileId}
            name={student.fullName}
            isActive={student.isActive}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              <h2>Courses</h2>
            </CardTitle>
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => setEnrolling(true)}
            >
              <PlusIcon /> Add course
            </Button>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {student.enrollments.map((e) => (
                <li
                  key={e.id}
                  className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono font-semibold">
                      {e.registrationNo}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {e.batch.course.name} · intake {e.batch.code} · enrolled{' '}
                      {formatDate(e.enrolledAt)}
                    </p>
                  </div>
                  <Select
                    value={e.status}
                    onValueChange={(v) =>
                      changeStatus(e.id, v as EnrollmentStatus)
                    }
                  >
                    <SelectTrigger
                      className="h-11 w-full sm:w-40"
                      aria-label={`Status of ${e.registrationNo}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(enrollmentStatusLabels).map(
                        ([value, label]) => (
                          <SelectItem
                            key={value}
                            value={value}
                            className="min-h-11"
                          >
                            {label}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Personal details</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Details
              items={[
                ['Name with initials', student.nameWithInitials],
                ['NIC / passport', student.nicOrPassport],
                ['Date of birth', formatDate(student.dateOfBirth)],
                ['School attended', student.schoolAttended],
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Contact</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Details
              items={[
                ['Address', student.address],
                ['Mobile', student.mobilePhone],
                ['Land', student.landPhone],
                ['Email', student.email],
                ['Guardian', student.guardianName],
                ["Guardian's contact", student.guardianPhone],
              ]}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              <h2>Education qualifications</h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            {student.qualifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">None recorded.</p>
            ) : (
              <>
                <QualificationTable
                  title="O/L"
                  q={student.qualifications.find((q) => q.level === 'OL')}
                />
                <QualificationTable
                  title="A/L"
                  q={student.qualifications.find((q) => q.level === 'AL')}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <EnrollDialog
        open={enrolling}
        onOpenChange={setEnrolling}
        student={student}
      />
    </>
  );
}
