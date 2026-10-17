import { KeyRoundIcon, LogOutIcon } from 'lucide-react';
import { Link } from 'react-router';
import { useAppSelector } from '@/app/store';
import { PageHeader } from '@/components/PageHeader';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLogout } from '@/features/auth/use-logout';
import { useGetStudentDashboardQuery } from '@/features/dashboard/dashboard-api';
import { initials } from '@/lib/utils';

const roleLabels = {
  ADMIN: 'Administrator',
  TEACHER: 'Teacher',
  STUDENT: 'Student',
} as const;

export function AccountPage() {
  const user = useAppSelector((s) => s.auth.user)!;
  const logout = useLogout();
  const { data: dashboard } = useGetStudentDashboardQuery(undefined, {
    skip: user.role !== 'STUDENT',
  });
  const registrationNos = dashboard?.courses.map((c) => c.registrationNo) ?? [];

  return (
    <>
      <PageHeader title="Account" />
      <Card className="max-w-lg">
        <CardContent className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              {user.avatarUrl && (
                <AvatarImage
                  src={user.avatarUrl}
                  alt=""
                  className="object-cover"
                />
              )}
              <AvatarFallback className="bg-gold text-xl font-semibold text-[var(--forest-950)]">
                {initials(user.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold">{user.fullName}</p>
              <Badge variant="secondary">{roleLabels[user.role]}</Badge>
            </div>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Username</dt>
            <dd className="font-mono">{user.username}</dd>
            {registrationNos.length > 0 && (
              <>
                <dt className="text-muted-foreground">Registration</dt>
                <dd className="font-mono">{registrationNos.join(', ')}</dd>
              </>
            )}
            {user.phone && (
              <>
                <dt className="text-muted-foreground">Phone</dt>
                <dd>{user.phone}</dd>
              </>
            )}
            {user.email && (
              <>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="break-all">{user.email}</dd>
              </>
            )}
          </dl>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild variant="outline" className="min-h-11">
              <Link to="/change-password">
                <KeyRoundIcon /> Change password
              </Link>
            </Button>
            <Button variant="ghost" className="min-h-11" onClick={logout}>
              <LogOutIcon /> Log out
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
