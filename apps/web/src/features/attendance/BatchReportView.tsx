import { DownloadIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { DataTable } from '@/components/DataTable';
import { ListSkeleton, LoadError } from '@/components/LoadState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { downloadFile } from '@/services/api';
import { useGetBatchReportQuery } from './attendance-api';
import type { AttendanceStats } from './types';

function Percent({ stats, low }: { stats: AttendanceStats; low: number }) {
  if (stats.percentage === null)
    return <span className="text-muted-foreground">—</span>;
  return (
    <span
      className={cn(
        'font-semibold tabular-nums',
        stats.percentage < low && 'text-destructive',
      )}
    >
      {stats.percentage}%
    </span>
  );
}

/** Attendance % per student for one intake; admins can download it as CSV. */
export function BatchReportView({
  batchId,
  canExport,
}: {
  batchId: string;
  canExport: boolean;
}) {
  const {
    currentData: report,
    error,
    refetch,
  } = useGetBatchReportQuery(batchId);
  const [downloading, setDownloading] = useState(false);

  if (error) return <LoadError onRetry={refetch} />;
  if (!report) return <ListSkeleton />;

  const download = async () => {
    setDownloading(true);
    try {
      await downloadFile(`attendance/batches/${batchId}/csv`);
    } catch {
      toast.error('Could not download the report');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {report.heldSessions} classes held so far. Excused and unmarked
          classes are not counted; below {report.threshold}% is shown in red.
        </p>
        {canExport && (
          <Button
            variant="outline"
            className="min-h-11"
            onClick={download}
            disabled={downloading}
          >
            {downloading ? <Spinner /> : <DownloadIcon />} Download CSV
          </Button>
        )}
      </div>
      <DataTable
        rows={report.rows}
        getRowId={(r) => r.enrollmentId}
        columns={[
          {
            header: 'Student',
            cell: (r) => (
              <span className="flex flex-wrap items-center gap-x-2">
                {r.fullName}
                <span className="font-mono text-xs text-muted-foreground">
                  {r.registrationNo}
                </span>
                {r.enrollmentStatus !== 'ACTIVE' && (
                  <Badge variant="secondary">
                    {r.enrollmentStatus.toLowerCase()}
                  </Badge>
                )}
              </span>
            ),
          },
          {
            header: 'Attendance',
            cell: (r) => <Percent stats={r.overall} low={report.threshold} />,
          },
          {
            header: 'P / L / A / E',
            cell: (r) => (
              <span className="tabular-nums">
                {r.overall.present} / {r.overall.late} / {r.overall.absent} /{' '}
                {r.overall.excused}
              </span>
            ),
          },
          ...report.modules.map((m) => ({
            header: m.code,
            cell: (r: (typeof report.rows)[number]) => (
              <Percent stats={r.byModule[m.id]} low={report.threshold} />
            ),
          })),
        ]}
      />
    </section>
  );
}
