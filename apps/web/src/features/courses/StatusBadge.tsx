import { Badge } from '@/components/ui/badge';
import { batchStatusLabels, type BatchStatus } from './types';

const variants = {
  PLANNED: 'outline',
  ACTIVE: 'default',
  COMPLETED: 'secondary',
} as const;

export function BatchStatusBadge({ status }: { status: BatchStatus }) {
  return <Badge variant={variants[status]}>{batchStatusLabels[status]}</Badge>;
}

export function ActiveBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge>Active</Badge>
  ) : (
    <Badge variant="secondary">Inactive</Badge>
  );
}
