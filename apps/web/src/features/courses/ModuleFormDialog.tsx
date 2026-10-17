import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { FormDialog } from '@/components/FormDialog';
import { TextField } from '@/components/TextField';
import { errorMessage } from '@/services/api';
import {
  useCreateModuleMutation,
  useUpdateModuleMutation,
} from './courses-api';
import type { CourseModule } from './types';

const schema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{1,10}$/, 'Up to 10 letters, digits or dashes, e.g. M01'),
  title: z.string().trim().min(1, 'Enter the module title').max(120),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  /** Edit this module; leave out to add one. */
  module?: CourseModule;
  suggestedCode?: string;
}

export function ModuleFormDialog({
  open,
  onOpenChange,
  courseId,
  module,
  suggestedCode,
}: Props) {
  const [createModule] = useCreateModuleMutation();
  const [updateModule] = useUpdateModuleMutation();
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });
  const { errors, isSubmitting } = form.formState;

  useEffect(() => {
    if (open)
      form.reset({
        code: module?.code ?? suggestedCode ?? '',
        title: module?.title ?? '',
      });
  }, [open, module, suggestedCode, form]);

  const onSubmit = async (values: FormValues) => {
    const result = module
      ? await updateModule({ courseId, id: module.id, ...values })
      : await createModule({ courseId, ...values });
    if (result.error) {
      form.setError('root', { message: errorMessage(result.error) });
      return;
    }
    toast.success(module ? 'Module updated' : `Module ${values.code} added`);
    onOpenChange(false);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={module ? 'Edit module' : 'Add module'}
      submitLabel={module ? 'Save' : 'Add module'}
      onSubmit={form.handleSubmit(onSubmit)}
      submitting={isSubmitting}
      error={errors.root?.message}
    >
      <TextField
        id="module-code"
        label="Module code"
        maxLength={10}
        autoCapitalize="characters"
        className="h-11 uppercase"
        error={errors.code}
        {...form.register('code')}
      />
      <TextField
        id="module-title"
        label="Module title"
        error={errors.title}
        {...form.register('title')}
      />
    </FormDialog>
  );
}
