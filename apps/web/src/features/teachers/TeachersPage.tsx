import { GraduationCapIcon, PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/EmptyState';
import { ListSkeleton, LoadError } from '@/components/LoadState';
import { PageHeader } from '@/components/PageHeader';
import { TempPasswordDialog } from '@/components/TempPasswordDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AccountActions } from '@/features/accounts/AccountActions';
import { initials } from '@/lib/utils';
import { TeacherFormDialog } from './TeacherFormDialog';
import { useGetTeachersQuery, type Teacher } from './teachers-api';

export function TeachersPage() {
  const { data: teachers, isLoading, error, refetch } = useGetTeachersQuery();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher>();
  const [login, setLogin] = useState<{
    username: string;
    temporaryPassword: string;
  }>();

  const openForm = (teacher?: Teacher) => {
    setEditing(teacher);
    setFormOpen(true);
  };

  const addButton = (
    <Button className="min-h-11" onClick={() => openForm()}>
      <PlusIcon /> Add teacher
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Teachers"
        description="Teacher logins. Usernames and passwords are created here."
        actions={addButton}
      />
      {isLoading ? (
        <ListSkeleton />
      ) : error || !teachers ? (
        <LoadError onRetry={refetch} />
      ) : teachers.length === 0 ? (
        <EmptyState
          icon={GraduationCapIcon}
          title="No teachers yet"
          action={addButton}
        />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {teachers.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-3 rounded-xl border bg-card p-3"
            >
              <button
                type="button"
                className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left"
                onClick={() => openForm(t)}
                aria-label={`Edit ${t.fullName}`}
              >
                <Avatar className="size-11">
                  {t.avatarUrl && (
                    <AvatarImage
                      src={t.avatarUrl}
                      alt=""
                      className="object-cover"
                    />
                  )}
                  <AvatarFallback className="bg-gold font-semibold text-[var(--forest-950)]">
                    {initials(t.fullName)}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {t.fullName}
                  </span>
                  <span className="block truncate font-mono text-sm text-muted-foreground">
                    {t.username}
                  </span>
                </span>
              </button>
              {!t.isActive && <Badge variant="secondary">Inactive</Badge>}
              <AccountActions
                profileId={t.id}
                name={t.fullName}
                isActive={t.isActive}
              />
            </li>
          ))}
        </ul>
      )}
      <TeacherFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        teacher={editing}
        onCreated={setLogin}
      />
      {login && (
        <TempPasswordDialog
          open
          onOpenChange={(open) => !open && setLogin(undefined)}
          username={login.username}
          password={login.temporaryPassword}
        />
      )}
    </>
  );
}
