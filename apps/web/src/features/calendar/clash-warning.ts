import { toast } from 'sonner';
import { formatTimeRange } from './time';
import type { Clash } from './types';

/** Saving is allowed, but the admin should know the teacher is double-booked. */
export function warnAboutClashes(clashes: Clash[]) {
  if (!clashes.length) return;
  const [first] = clashes;
  toast.warning(`${first.teacher} is already teaching ${first.batch} then`, {
    description:
      formatTimeRange(first.startsAt, first.endsAt) +
      (clashes.length > 1 ? ` and ${clashes.length - 1} more` : ''),
    duration: 10_000,
  });
}
