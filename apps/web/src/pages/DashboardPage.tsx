import { useAppSelector } from '@/app/store';
import { PageHeader } from '@/components/PageHeader';
import { AdminDashboard } from '@/features/dashboard/AdminDashboard';
import { StudentDashboard } from '@/features/dashboard/StudentDashboard';
import { TeacherDashboard } from '@/features/dashboard/TeacherDashboard';

export function DashboardPage() {
  const user = useAppSelector((s) => s.auth.user)!;
  return (
    <>
      <PageHeader
        title={`Welcome, ${user.fullName.split(' ')[0]}`}
        description="Wintskill Salon Academy"
      />
      {user.role === 'ADMIN' && <AdminDashboard />}
      {user.role === 'TEACHER' && <TeacherDashboard />}
      {user.role === 'STUDENT' && <StudentDashboard />}
    </>
  );
}
