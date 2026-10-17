import { LayoutDashboardIcon } from 'lucide-react';
import { useAppSelector } from '@/app/store';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';

/** Role dashboards are filled in during Phase 8. */
export function DashboardPage() {
  const user = useAppSelector((s) => s.auth.user)!;
  return (
    <>
      <PageHeader
        title={`Welcome, ${user.fullName.split(' ')[0]}`}
        description="Wintskill Salon Academy"
      />
      <EmptyState
        icon={LayoutDashboardIcon}
        title="Nothing here yet"
        description="Your classes, attendance and course materials will appear here."
      />
    </>
  );
}
