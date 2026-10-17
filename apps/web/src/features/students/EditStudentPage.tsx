import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeftIcon } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { ListSkeleton, LoadError } from '@/components/LoadState';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldGroup } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { errorMessage } from '@/services/api';
import {
  emptyStudentForm,
  fromStudent,
  studentSchema,
  toPayload,
  type StudentFormValues,
} from './student-form';
import {
  ContactFields,
  EducationFields,
  PersonalFields,
} from './StudentFields';
import { useGetStudentQuery, useUpdateStudentMutation } from './students-api';

export function EditStudentPage() {
  const { id } = useParams() as { id: string };
  const navigate = useNavigate();
  const { data: student, isLoading, error, refetch } = useGetStudentQuery(id);
  const [updateStudent] = useUpdateStudentMutation();
  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: emptyStudentForm(),
  });
  const { errors, isSubmitting } = form.formState;

  useEffect(() => {
    if (student) form.reset(fromStudent(student));
  }, [student, form]);

  const back = (
    <Button asChild variant="ghost" className="mb-2 min-h-11 -ml-3">
      <Link to=".." relative="path">
        <ArrowLeftIcon /> Back to student
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

  const onSubmit = async (values: StudentFormValues) => {
    const result = await updateStudent({ id, ...toPayload(values) });
    if (result.error) {
      form.setError('root', { message: errorMessage(result.error) });
      return;
    }
    toast.success('Student updated');
    navigate('..', { relative: 'path' });
  };

  const section = (title: string, children: React.ReactNode) => (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{title}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <FieldGroup>{children}</FieldGroup>
      </CardContent>
    </Card>
  );

  return (
    <>
      {back}
      <PageHeader title={`Edit ${student.fullName}`} />
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className="flex max-w-2xl flex-col gap-4"
      >
        {section('Personal details', <PersonalFields form={form} />)}
        {section('Contact details', <ContactFields form={form} />)}
        {section('Education qualifications', <EducationFields form={form} />)}
        {errors.root && (
          <p role="alert" className="text-sm text-destructive">
            {errors.root.message}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button asChild variant="outline" className="min-h-11">
            <Link to=".." relative="path">
              Cancel
            </Link>
          </Button>
          <Button type="submit" className="min-h-11" disabled={isSubmitting}>
            {isSubmitting && <Spinner />}
            Save changes
          </Button>
        </div>
      </form>
    </>
  );
}
