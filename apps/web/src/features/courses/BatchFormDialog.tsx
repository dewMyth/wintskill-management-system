import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { FormDialog } from '@/components/FormDialog';
import { TextField } from '@/components/TextField';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { todayInput, toDateInput } from '@/lib/format';
import { errorMessage } from '@/services/api';
import { useCreateBatchMutation, useUpdateBatchMutation } from './courses-api';
import {
  batchStatusLabels,
  type Batch,
  type BatchStatus,
  type CourseDetail,
} from './types';

const schema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^\d{4}[A-Z]$/, 'Year and a letter, e.g. 2026A'),
    name: z.string().trim().max(120),
    startDate: z.string().min(1, 'Choose the start date'),
    endDate: z.string(),
    status: z.enum(['PLANNED', 'ACTIVE', 'COMPLETED']),
  })
  .refine((v) => !v.endDate || v.endDate >= v.startDate, {
    path: ['endDate'],
    message: 'Must be on or after the start date',
  });
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: CourseDetail;
  /** Edit this intake; leave out to start a new one. */
  batch?: Batch;
}

export function BatchFormDialog({ open, onOpenChange, course, batch }: Props) {
  const [createBatch] = useCreateBatchMutation();
  const [updateBatch] = useUpdateBatchMutation();
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });
  const { errors, isSubmitting } = form.formState;
  const code = useWatch({ control: form.control, name: 'code' });

  useEffect(() => {
    if (!open) return;
    form.reset({
      code: batch?.code ?? course.nextBatchCode ?? '',
      name: batch?.name ?? '',
      startDate: batch ? toDateInput(batch.startDate) : todayInput(),
      endDate: toDateInput(batch?.endDate ?? null),
      status: batch?.status ?? 'PLANNED',
    });
  }, [open, batch, course.nextBatchCode, form]);

  const onSubmit = async ({
    code,
    name,
    startDate,
    endDate,
    status,
  }: FormValues) => {
    const result = batch
      ? await updateBatch({
          courseId: course.id,
          id: batch.id,
          name: name || undefined,
          startDate,
          endDate: endDate || null,
          status,
        })
      : await createBatch({
          courseId: course.id,
          code,
          name: name || undefined,
          startDate,
          endDate: endDate || null,
        });
    if (result.error) {
      form.setError('root', { message: errorMessage(result.error) });
      return;
    }
    toast.success(batch ? 'Intake updated' : `Intake ${code} started`);
    onOpenChange(false);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={batch ? `Edit intake ${batch.code}` : 'Start new intake'}
      description={
        batch
          ? undefined
          : `Students in this intake get numbers like ${course.code}${code || '2026A'}001.`
      }
      submitLabel={batch ? 'Save' : 'Start intake'}
      onSubmit={form.handleSubmit(onSubmit)}
      submitting={isSubmitting}
      error={errors.root?.message}
    >
      {!batch && (
        <TextField
          id="batch-code"
          label="Intake code"
          description="Year and a letter. The next free code is filled in. Cannot be changed later."
          maxLength={5}
          autoCapitalize="characters"
          className="h-11 uppercase"
          error={errors.code}
          {...form.register('code')}
        />
      )}
      <TextField
        id="batch-name"
        label="Name (optional)"
        placeholder={`${course.code} ${code}`}
        error={errors.name}
        {...form.register('name')}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id="batch-start"
          type="date"
          label="Start date"
          error={errors.startDate}
          {...form.register('startDate')}
        />
        <TextField
          id="batch-end"
          type="date"
          label="End date (optional)"
          error={errors.endDate}
          {...form.register('endDate')}
        />
      </div>
      {batch && (
        <Field>
          <FieldLabel htmlFor="batch-status">Status</FieldLabel>
          <Controller
            control={form.control}
            name="status"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(v) => field.onChange(v as BatchStatus)}
              >
                <SelectTrigger id="batch-status" className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(batchStatusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value} className="min-h-11">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      )}
    </FormDialog>
  );
}
