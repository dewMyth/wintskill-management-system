import { cn } from '@/lib/utils';
import { statusLabels, type AttendanceStatus } from './types';

const styles: Record<AttendanceStatus, string> = {
  PRESENT: 'bg-primary text-primary-foreground',
  ABSENT: 'bg-destructive text-white',
  LATE: 'bg-gold text-[var(--forest-950)]',
  EXCUSED: 'bg-muted text-muted-foreground',
};

export function StatusPill({ status }: { status: AttendanceStatus }) {
  return (
    <span
      className={cn(
        'inline-flex w-20 justify-center rounded-full px-2 py-1 text-xs font-semibold',
        styles[status],
      )}
    >
      {statusLabels[status]}
    </span>
  );
}
