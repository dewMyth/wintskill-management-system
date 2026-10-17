import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { FormDialog } from '@/components/FormDialog';
import { PhotoPicker } from '@/components/PhotoPicker';
import { TextField } from '@/components/TextField';
import { useUploadPhotoMutation } from '@/features/accounts/accounts-api';
import { errorMessage } from '@/services/api';
import {
  useCreateTeacherMutation,
  useUpdateTeacherMutation,
  type Teacher,
} from './teachers-api';

const PHONE = /^\+?[0-9 -]{9,15}$/;
const schema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z][a-z0-9._-]{2,29}$/,
      '3–30 letters, digits, dots, dashes or underscores, starting with a letter',
    ),
  fullName: z.string().trim().min(1, 'Enter the full name').max(150),
  phone: z
    .string()
    .trim()
    .refine(
      (v) => !v || PHONE.test(v),
      'Enter a phone number, e.g. 0771234567',
    ),
  email: z.union([z.literal(''), z.email('Enter a valid email address')]),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher?: Teacher;
  onCreated: (login: { username: string; temporaryPassword: string }) => void;
}

export function TeacherFormDialog({
  open,
  onOpenChange,
  teacher,
  onCreated,
}: Props) {
  const [createTeacher] = useCreateTeacherMutation();
  const [updateTeacher] = useUpdateTeacherMutation();
  const [uploadPhoto, { isLoading: uploading }] = useUploadPhotoMutation();
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });
  const { errors, isSubmitting } = form.formState;

  useEffect(() => {
    if (open) {
      form.reset({
        username: teacher?.username ?? '',
        fullName: teacher?.fullName ?? '',
        phone: teacher?.phone ?? '',
        email: teacher?.email ?? '',
      });
    }
  }, [open, teacher, form]);

  const onSubmit = async ({ username, fullName, phone, email }: FormValues) => {
    const details = { fullName, phone: phone || null, email: email || null };
    if (teacher) {
      const result = await updateTeacher({ id: teacher.id, ...details });
      if (result.error)
        return form.setError('root', { message: errorMessage(result.error) });
      toast.success('Teacher updated');
      onOpenChange(false);
    } else {
      const result = await createTeacher({ username, ...details });
      if (result.error)
        return form.setError('root', { message: errorMessage(result.error) });
      onOpenChange(false);
      onCreated(result.data);
    }
  };

  const changePhoto = async (file: File) => {
    const result = await uploadPhoto({ profileId: teacher!.id, file });
    if (result.error) toast.error(errorMessage(result.error));
    else toast.success('Photo updated');
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={teacher ? `Edit ${teacher.fullName}` : 'Add teacher'}
      description={
        teacher ? undefined : 'You will get a temporary password to give them.'
      }
      submitLabel={teacher ? 'Save' : 'Add teacher'}
      onSubmit={form.handleSubmit(onSubmit)}
      submitting={isSubmitting}
      error={errors.root?.message}
    >
      {teacher && (
        <PhotoPicker
          name={teacher.fullName}
          photoUrl={teacher.avatarUrl}
          busy={uploading}
          onChange={changePhoto}
        />
      )}
      {!teacher && (
        <TextField
          id="teacher-username"
          label="Username"
          description="Used to sign in, e.g. nimali.p. Cannot be changed later."
          autoCapitalize="none"
          autoComplete="off"
          error={errors.username}
          {...form.register('username')}
        />
      )}
      <TextField
        id="teacher-name"
        label="Full name"
        error={errors.fullName}
        {...form.register('fullName')}
      />
      <TextField
        id="teacher-phone"
        type="tel"
        label="Mobile number (optional)"
        error={errors.phone}
        {...form.register('phone')}
      />
      <TextField
        id="teacher-email"
        type="email"
        label="Email (optional)"
        error={errors.email}
        {...form.register('email')}
      />
    </FormDialog>
  );
}
