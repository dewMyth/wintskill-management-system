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
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useGetBatchesQuery } from '@/features/courses/courses-api';
import { errorMessage } from '@/services/api';
import {
  useCreateEventMutation,
  useDeleteEventMutation,
  useUpdateEventMutation,
} from './calendar-api';
import { dayAfter, dayBefore, localDate, localTime, toInstant } from './time';
import { eventTypeLabels, type CalendarEvent, type EventType } from './types';

const EVERYONE = 'all';
const schema = z
  .object({
    title: z.string().trim().min(1, 'Enter a title').max(120),
    type: z.enum(['EXAM', 'HOLIDAY', 'OTHER']),
    batchId: z.string(),
    allDay: z.boolean(),
    startDate: z.string().min(1, 'Choose the date'),
    endDate: z.string(),
    start: z.string(),
    end: z.string(),
    description: z.string().trim().max(1000),
  })
  .superRefine((v, ctx) => {
    if (v.allDay && v.endDate && v.endDate < v.startDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['endDate'],
        message: 'Must be on or after the first day',
      });
    }
    if (!v.allDay && (!v.start || !v.end || v.end <= v.start)) {
      ctx.addIssue({
        code: 'custom',
        path: ['end'],
        message: 'Must be after the start time',
      });
    }
  });
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: CalendarEvent;
  initial?: { start: Date; allDay?: boolean };
}

export function EventFormDialog({ open, onOpenChange, event, initial }: Props) {
  const [createEvent] = useCreateEventMutation();
  const [updateEvent] = useUpdateEventMutation();
  const [deleteEvent] = useDeleteEventMutation();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { data: batches } = useGetBatchesQuery();
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });
  const { errors, isSubmitting } = form.formState;
  const allDay = useWatch({ control: form.control, name: 'allDay' });

  useEffect(() => {
    if (!open) return;
    const start = event
      ? new Date(event.startsAt)
      : (initial?.start ?? new Date());
    const end = event
      ? new Date(event.endsAt)
      : new Date(start.getTime() + 60 * 60 * 1000);
    const isAllDay = event?.allDay ?? initial?.allDay ?? false;
    form.reset({
      title: event?.title ?? '',
      type: event?.type ?? 'EXAM',
      batchId: event?.batchId ?? EVERYONE,
      allDay: isAllDay,
      startDate: localDate(start),
      endDate: isAllDay && event ? dayBefore(localDate(end)) : localDate(start),
      start: localTime(start),
      end: localTime(end),
      description: event?.description ?? '',
    });
  }, [open, event, initial, form]);

  const onSubmit = async (v: FormValues) => {
    const body = {
      title: v.title,
      type: v.type,
      batchId: v.batchId === EVERYONE ? null : v.batchId,
      allDay: v.allDay,
      startsAt: v.allDay
        ? toInstant(v.startDate)
        : toInstant(v.startDate, v.start),
      endsAt: v.allDay
        ? toInstant(dayAfter(v.endDate || v.startDate))
        : toInstant(v.startDate, v.end),
      description: v.description || null,
    };
    const result = event
      ? await updateEvent({ id: event.id, ...body })
      : await createEvent(body);
    if (result.error)
      return form.setError('root', { message: errorMessage(result.error) });
    toast.success(event ? 'Event updated' : 'Event added');
    onOpenChange(false);
  };

  const remove = async () => {
    setConfirmDelete(false);
    const result = await deleteEvent(event!.id);
    if (result.error) return toast.error(errorMessage(result.error));
    toast.success('Event deleted');
    onOpenChange(false);
  };

  const openBatches =
    batches?.filter(
      (b) => b.status !== 'COMPLETED' || b.id === event?.batchId,
    ) ?? [];

  return (
    <>
      <FormDialog
        open={open}
        onOpenChange={onOpenChange}
        title={event ? 'Edit event' : 'Add event'}
        submitLabel={event ? 'Save' : 'Add event'}
        onSubmit={form.handleSubmit(onSubmit)}
        submitting={isSubmitting}
        error={errors.root?.message}
      >
        <TextField
          id="event-title"
          label="Title"
          error={errors.title}
          {...form.register('title')}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="event-type">Type</FieldLabel>
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => field.onChange(v as EventType)}
                >
                  <SelectTrigger id="event-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(eventTypeLabels).map(([value, label]) => (
                      <SelectItem
                        key={value}
                        value={value}
                        className="min-h-11"
                      >
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="event-batch">For</FieldLabel>
            <Controller
              control={form.control}
              name="batchId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="event-batch" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EVERYONE} className="min-h-11">
                      Whole academy
                    </SelectItem>
                    {openBatches.map((b) => (
                      <SelectItem key={b.id} value={b.id} className="min-h-11">
                        {b.course.code} {b.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        </div>
        <Field orientation="horizontal">
          <Checkbox
            id="event-all-day"
            className="size-5"
            checked={allDay}
            onCheckedChange={(checked) =>
              form.setValue('allDay', checked === true)
            }
          />
          <FieldLabel htmlFor="event-all-day" className="min-h-11 font-normal">
            All day
          </FieldLabel>
        </Field>
        {allDay ? (
          <div className="grid grid-cols-2 gap-4">
            <TextField
              id="event-start-date"
              type="date"
              label="First day"
              error={errors.startDate}
              {...form.register('startDate')}
            />
            <TextField
              id="event-end-date"
              type="date"
              label="Last day"
              error={errors.endDate}
              {...form.register('endDate')}
            />
          </div>
        ) : (
          <>
            <TextField
              id="event-date"
              type="date"
              label="Date"
              error={errors.startDate}
              {...form.register('startDate')}
            />
            <div className="grid grid-cols-2 gap-4">
              <TextField
                id="event-start"
                type="time"
                label="Starts"
                error={errors.start}
                {...form.register('start')}
              />
              <TextField
                id="event-end"
                type="time"
                label="Ends"
                error={errors.end}
                {...form.register('end')}
              />
            </div>
          </>
        )}
        <Field>
          <FieldLabel htmlFor="event-description">
            Details (optional)
          </FieldLabel>
          <Textarea
            id="event-description"
            rows={3}
            {...form.register('description')}
          />
        </Field>
        {event && (
          <Button
            type="button"
            variant="ghost"
            className="min-h-11 self-start text-destructive"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2Icon /> Delete this event
          </Button>
        )}
      </FormDialog>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this event?"
        description="This cannot be undone."
        confirmLabel="Delete event"
        destructive
        onConfirm={remove}
      />
    </>
  );
}
