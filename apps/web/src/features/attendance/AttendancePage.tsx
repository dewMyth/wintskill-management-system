import { ClipboardCheckIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useAppSelector } from '@/app/store';
import { EmptyState } from '@/components/EmptyState';
import { ListSkeleton, LoadError } from '@/components/LoadState';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatTimeRange } from '@/features/calendar/time';
import { useGetBatchesQuery } from '@/features/courses/courses-api';
import { useGetRecentSessionsQuery } from './attendance-api';
import { BatchReportView } from './BatchReportView';

const ALL = 'all';

export function AttendancePage() {
  const isAdmin = useAppSelector((s) => s.auth.user!.role) === 'ADMIN';
  const [batchId, setBatchId] = useState(ALL);
  const [reportBatchId, setReportBatchId] = useState('');
  const { data: batches } = useGetBatchesQuery(undefined, { skip: !isAdmin });
  const {
    data: sessions,
    isLoading,
    error,
    refetch,
  } = useGetRecentSessionsQuery({
    batchId: batchId === ALL ? undefined : batchId,
  });

  // Teachers can report on the intakes they teach; admins on any.
  const reportBatches = useMemo(() => {
    if (isAdmin)
      return (batches ?? []).map((b) => ({
        id: b.id,
        label: `${b.course.code} ${b.code} · ${b.course.name}`,
      }));
    const seen = new Map<string, string>();
    for (const s of sessions ?? [])
      seen.set(
        s.batch.id,
        `${s.batch.course.code} ${s.batch.code} · ${s.batch.course.name}`,
      );
    return [...seen].map(([id, label]) => ({ id, label }));
  }, [isAdmin, batches, sessions]);

  return (
    <>
      <PageHeader title="Attendance" />
      <Tabs defaultValue="classes">
        <TabsList className="mb-4 w-full sm:w-fit">
          <TabsTrigger value="classes" className="min-h-11 flex-1 sm:flex-none">
            Classes
          </TabsTrigger>
          <TabsTrigger value="reports" className="min-h-11 flex-1 sm:flex-none">
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="classes" className="flex flex-col gap-4">
          {isAdmin && (
            <Select value={batchId} onValueChange={setBatchId}>
              <SelectTrigger
                className="w-full sm:w-72"
                aria-label="Show intake"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL} className="min-h-11">
                  All intakes
                </SelectItem>
                {batches?.map((b) => (
                  <SelectItem key={b.id} value={b.id} className="min-h-11">
                    {b.course.code} {b.code} · {b.course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <p className="text-sm text-muted-foreground">
            Classes from the last two weeks.
          </p>
          {isLoading ? (
            <ListSkeleton />
          ) : error || !sessions ? (
            <LoadError onRetry={refetch} />
          ) : sessions.length === 0 ? (
            <EmptyState icon={ClipboardCheckIcon} title="No recent classes" />
          ) : (
            <ul className="flex flex-col gap-2">
              {sessions.map((s) => (
                <li key={s.id}>
                  <Link
                    to={s.id}
                    className="flex min-h-16 items-center gap-3 rounded-xl border bg-card px-4 py-3 hover:bg-muted"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">
                        {s.batch.course.code} {s.batch.code}
                        {s.module && ` · ${s.module.title}`}
                      </span>
                      <span className="block text-sm text-muted-foreground">
                        {formatTimeRange(s.startsAt, s.endsAt)}
                        {isAdmin && ` · ${s.teacher.fullName}`}
                      </span>
                    </span>
                    {s.marked === 0 ? (
                      <Badge variant="destructive">Not marked</Badge>
                    ) : (
                      <Badge variant="secondary" className="tabular-nums">
                        {s.attended}/{s.marked} present
                      </Badge>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="reports" className="flex flex-col gap-4">
          <Select value={reportBatchId} onValueChange={setReportBatchId}>
            <SelectTrigger
              className="w-full sm:w-80"
              aria-label="Report for intake"
            >
              <SelectValue placeholder="Choose an intake" />
            </SelectTrigger>
            <SelectContent>
              {reportBatches.map((b) => (
                <SelectItem key={b.id} value={b.id} className="min-h-11">
                  {b.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {reportBatchId && (
            <BatchReportView batchId={reportBatchId} canExport={isAdmin} />
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
