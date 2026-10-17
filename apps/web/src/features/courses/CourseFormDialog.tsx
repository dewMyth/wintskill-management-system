import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { FormDialog } from '@/components/FormDialog';
import { TextField } from '@/components/TextField';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { errorMessage } from '@/services/api';
import {
  useCreateCourseMutation,
  useUpdateCourseMutation,
} from './courses-api';
import type { Course } from './types';

const schema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2,6}$/, '2–6 letters, e.g. HSC'),
  name: z.string().trim().min(1, 'Enter the course name').max(120),
  description: z.string().trim().max(1000),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Edit this course; leave out to create one. */
  course?: Course;
  onCreated?: (course: Course) => void;
}

export function CourseFormDialog({
  open,
  onOpenChange,
  course,
  onCreated,
}: Props) {
  const [createCourse] = useCreateCourseMutation();
  const [updateCourse] = useUpdateCourseMutation();
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });
  const { errors, isSubmitting } = form.formState;

  useEffect(() => {
    if (open) {
      form.reset({
        code: course?.code ?? '',
        name: course?.name ?? '',
        description: course?.description ?? '',
      });
    }
  }, [open, course, form]);

  const onSubmit = async ({ code, ...values }: FormValues) => {
    const result = course
      ? await updateCourse({ id: course.id, ...values })
      : await createCourse({ code, ...values });
    if (result.error) {
      form.setError('root', { message: errorMessage(result.error) });
      return;
    }
    toast.success(course ? 'Course updated' : `Course ${code} created`);
    onOpenChange(false);
    if (!course) onCreated?.(result.data);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={course ? 'Edit course' : 'New course'}
      submitLabel={course ? 'Save' : 'Create course'}
      onSubmit={form.handleSubmit(onSubmit)}
      submitting={isSubmitting}
      error={errors.root?.message}
    >
      {!course && (
        <TextField
          id="course-code"
          label="Course code"
          description="Starts every registration number, e.g. HSC → HSC2026A001. Cannot be changed later."
          maxLength={6}
          autoCapitalize="characters"
          className="h-11 uppercase"
          error={errors.code}
          {...form.register('code')}
        />
      )}
      <TextField
        id="course-name"
        label="Course name"
        error={errors.name}
        {...form.register('name')}
      />
      <Field data-invalid={!!errors.description}>
        <FieldLabel htmlFor="course-description">
          Description (optional)
        </FieldLabel>
        <Textarea
          id="course-description"
          rows={3}
          {...form.register('description')}
        />
        <FieldError errors={[errors.description]} />
      </Field>
    </FormDialog>
  );
}
