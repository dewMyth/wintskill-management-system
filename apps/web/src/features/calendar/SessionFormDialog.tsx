import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2Icon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { FormDialog } from '@/components/FormDialog';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useGetBatchesQuery,
  useGetCourseQuery,
} from '@/features/courses/courses-api';
import { IntakePicker } from '@/features/courses/IntakePicker';
import { useGetTeachersQuery } from '@/features/teachers/teachers-api';
import { errorMessage } from '@/services/api';
import {
  useCreateSessionMutation,
  useDeleteSessionMutation,
  useUpdateSessionMutation,
} from './calendar-api';
import { warnAboutClashes } from './clash-warning';
import { endOfDay, localDate, localTime, toInstant } from './time';
import type { ClassSession } from './types';

const NONE = 'none';
const schema = z
  .object({
    batchId: z.string().min(1, 'Choose a course intake'),
    moduleId: z.string(),
    teacherId: z.string().min(1, 'Choose a teacher'),
    date: z.string().min(1, 'Choose the date'),
    start: z.string().min(1, 'Choose the start time'),
    end: z.string().min(1, 'Choose the end time'),
    venue: z.string().trim().max(100),
    notes: z.string().trim().max(500),
    repeatUntil: z.string(),
  })
  .refine((v) => !v.start || !v.end || v.end > v.start, {
    path: ['end'],
    message: 'Must be after the start time',
  })
  .refine((v) => !v.repeatUntil || v.repeatUntil >= v.date, {
    path: ['repeatUntil'],
    message: 'Must be on or after the class date',
  });
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Edit this class; leave out to add one. */
  session?: ClassSession;
  /** Prefill for a new class, e.g. the slot tapped in the calendar. */
  initial?: { start?: Date; end?: Date; batchId?: string };
}

export function SessionFormDialog({
  open,
  onOpenChange,
  session,
  initial,
}: Props) {
  const [createSession] = useCreateSessionMutation();
  const [updateSession] = useUpdateSessionMutation();
  const [deleteSession] = useDeleteSessionMutation();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { data: teachers } = useGetTeachersQuery();
  const { data: batches } = useGetBatchesQuery();
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });
  const { errors, isSubmitting } = form.formState;

  const batchId = useWatch({ control: form.control, name: 'batchId' });
  const courseId = batches?.find((b) => b.id === batchId)?.course.id;
  // currentData, not data: while another intake's modules load, show none rather than the old ones.
  const { currentData: course } = useGetCourseQuery(courseId!, {
    skip: !courseId,
  });

  useEffect(() => {
    if (!open) return;
    // A tapped slot sets the start; otherwise suggest a usual class time today.
    const start = session
      ? new Date(session.startsAt)
      : (initial?.start ?? new Date(`${localDate(new Date())}T09:00`));
    const end = session
      ? new Date(session.endsAt)
      : (initial?.end ?? new Date(start.getTime() + 3 * 60 * 60 * 1000));
    form.reset({
      batchId: session?.batchId ?? initial?.batchId ?? '',
      moduleId: session?.moduleId ?? NONE,
      teacherId: session?.teacherId ?? '',
      date: localDate(start),
      start: localTime(start),
      end: localTime(end),
      venue: session?.venue ?? '',
      notes: session?.notes ?? '',
      repeatUntil: '',
    });
  }, [open, session, initial, form]);

  const onSubmit = async (v: FormValues) => {
    const details = {
      moduleId: v.moduleId === NONE ? null : v.moduleId,
      teacherId: v.teacherId,
      startsAt: toInstant(v.date, v.start),
      endsAt: toInstant(v.date, v.end),
      venue: v.venue || null,
      notes: v.notes || null,
    };
    if (session) {
      const result = await updateSession({ id: session.id, ...details });
      if (result.error)
        return form.setError('root', { message: errorMessage(result.error) });
      toast.success('Class updated');
      warnAboutClashes(result.data.clashes);
    } else {
      const result = await createSession({
        ...details,
        batchId: v.batchId,
        repeatWeeklyUntil: v.repeatUntil ? endOfDay(v.repeatUntil) : undefined,
      });
      if (result.error)
        return form.setError('root', { message: errorMessage(result.error) });
      const count = result.data.sessions.length;
      toast.success(
        count === 1 ? 'Class added' : `${count} weekly classes added`,
      );
      warnAboutClashes(result.data.clashes);
    }
    onOpenChange(false);
  };

  const remove = async () => {
    setConfirmDelete(false);
    const result = await deleteSession(session!.id);
    if (result.error) return toast.error(errorMessage(result.error));
    toast.success('Class deleted');
    onOpenChange(false);
  };

  const activeTeachers =
    teachers?.filter((t) => t.isActive || t.id === session?.teacherId) ?? [];

  return (
    <>
      <FormDialog
        open={open}
        onOpenChange={onOpenChange}
        title={session ? 'Edit class' : 'Add class'}
        description={
          session
            ? `${session.batch.course.code} ${session.batch.code} · ${session.batch.course.name}`
            : undefined
        }
        submitLabel={session ? 'Save' : 'Add class'}
        onSubmit={form.handleSubmit(onSubmit)}
        submitting={isSubmitting}
        error={errors.root?.message}
      >
        {!session && (
          <Controller
            control={form.control}
            name="batchId"
            render={({ field }) => (
              <IntakePicker
                id="session-batch"
                value={field.value}
                onChange={(v) => {
                  field.onChange(v);
                  form.setValue('moduleId', NONE);
                }}
                error={errors.batchId?.message}
              />
            )}
          />
        )}
        <Field>
          <FieldLabel htmlFor="session-module">Module (optional)</FieldLabel>
          <Controller
            control={form.control}
            name="moduleId"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={!course}
              >
                <SelectTrigger id="session-module" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE} className="min-h-11">
                    No specific module
                  </SelectItem>
                  {course?.modules.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="min-h-11">
                      {m.code} · {m.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field data-invalid={!!errors.teacherId}>
          <FieldLabel htmlFor="session-teacher">Teacher</FieldLabel>
          <Controller
            control={form.control}
            name="teacherId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  id="session-teacher"
                  className="w-full"
                  aria-invalid={!!errors.teacherId}
                >
                  <SelectValue placeholder="Choose a teacher" />
                </SelectTrigger>
                <SelectContent>
                  {activeTeachers.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="min-h-11">
                      {t.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError errors={[errors.teacherId]} />
        </Field>
        <TextField
          id="session-date"
          type="date"
          label="Date"
          error={errors.date}
          {...form.register('date')}
        />
        <div className="grid grid-cols-2 gap-4">
          <TextField
            id="session-start"
            type="time"
            label="Starts"
            error={errors.start}
            {...form.register('start')}
          />
          <TextField
            id="session-end"
            type="time"
            label="Ends"
            error={errors.end}
            {...form.register('end')}
          />
        </div>
        <TextField
          id="session-venue"
          label="Venue (optional)"
          error={errors.venue}
          {...form.register('venue')}
        />
        <TextField
          id="session-notes"
          label="Notes (optional)"
          error={errors.notes}
          {...form.register('notes')}
        />
        {!session && (
          <TextField
            id="session-repeat"
            type="date"
            label="Repeat weekly until (optional)"
            description="Adds the same class every week up to this date. Each one can be edited on its own."
            error={errors.repeatUntil}
            {...form.register('repeatUntil')}
          />
        )}
        {session && (
          <Button
            type="button"
            variant="ghost"
            className="min-h-11 self-start text-destructive"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2Icon /> Delete this class
          </Button>
        )}
      </FormDialog>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this class?"
        description="Attendance marked for it will be deleted too. This cannot be undone."
        confirmLabel="Delete class"
        destructive
        onConfirm={remove}
      />
    </>
  );
}
