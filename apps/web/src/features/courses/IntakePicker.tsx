import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetBatchesQuery } from './courses-api';
import type { BatchWithCourse } from './types';

interface Props {
  id: string;
  value: string;
  onChange: (batchId: string) => void;
  /** Intakes the student is already in. */
  exclude?: string[];
  error?: string;
}

/** Choose an open intake (not completed, course active), grouped by course. */
export function IntakePicker({
  id,
  value,
  onChange,
  exclude = [],
  error,
}: Props) {
  const { data: batches, isLoading } = useGetBatchesQuery();
  if (isLoading) return <Skeleton className="h-16 w-full" />;

  const open = (batches ?? []).filter(
    (b) =>
      b.status !== 'COMPLETED' && b.course.isActive && !exclude.includes(b.id),
  );
  const byCourse = new Map<string, BatchWithCourse[]>();
  for (const b of open)
    byCourse.set(b.course.code, [...(byCourse.get(b.course.code) ?? []), b]);
  const label = (b: BatchWithCourse) =>
    `${b.course.code} ${b.code}${b.status === 'PLANNED' ? ' (planned)' : ''}`;

  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>Course intake</FieldLabel>
      {open.length === 0 ? (
        <FieldDescription>
          No open intakes. Start one from Courses first.
        </FieldDescription>
      ) : (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger id={id} className="h-11 w-full" aria-invalid={!!error}>
            <SelectValue placeholder="Choose a course intake" />
          </SelectTrigger>
          <SelectContent>
            {[...byCourse].map(([code, items]) => (
              <SelectGroup key={code}>
                <SelectLabel>{items[0].course.name}</SelectLabel>
                {items.map((b) => (
                  <SelectItem key={b.id} value={b.id} className="min-h-11">
                    {label(b)}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      )}
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}
