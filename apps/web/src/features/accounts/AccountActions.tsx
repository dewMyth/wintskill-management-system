import { EllipsisVerticalIcon, KeyRoundIcon, PowerIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { TempPasswordDialog } from '@/components/TempPasswordDialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { errorMessage } from '@/services/api';
import {
  useResetPasswordMutation,
  useSetAccountStatusMutation,
} from './accounts-api';

interface Props {
  profileId: string;
  name: string;
  isActive: boolean;
}

/** "⋮" menu for a login: reset password (shows the new temporary one) and activate/deactivate. */
export function AccountActions({ profileId, name, isActive }: Props) {
  const [resetPassword] = useResetPasswordMutation();
  const [setStatus] = useSetAccountStatusMutation();
  const [confirm, setConfirm] = useState<'reset' | 'status'>();
  const [login, setLogin] = useState<{
    username: string;
    temporaryPassword: string;
  }>();

  const run = async () => {
    const action = confirm;
    setConfirm(undefined);
    if (action === 'reset') {
      const result = await resetPassword(profileId);
      if (result.error) toast.error(errorMessage(result.error));
      else setLogin(result.data);
    } else {
      const result = await setStatus({ profileId, isActive: !isActive });
      if (result.error) toast.error(errorMessage(result.error));
      else
        toast.success(
          isActive
            ? `${name} can no longer sign in`
            : `${name} can sign in again`,
        );
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="size-11"
            aria-label={`Account actions for ${name}`}
          >
            <EllipsisVerticalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="min-h-11"
            onSelect={() => setConfirm('reset')}
          >
            <KeyRoundIcon /> Reset password
          </DropdownMenuItem>
          <DropdownMenuItem
            className="min-h-11"
            variant={isActive ? 'destructive' : 'default'}
            onSelect={() => setConfirm('status')}
          >
            <PowerIcon /> {isActive ? 'Deactivate login' : 'Activate login'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(open) => !open && setConfirm(undefined)}
        title={
          confirm === 'reset'
            ? `Reset ${name}'s password?`
            : isActive
              ? `Deactivate ${name}'s login?`
              : `Activate ${name}'s login?`
        }
        description={
          confirm === 'reset'
            ? 'Their current password stops working. You will get a temporary password to give them.'
            : isActive
              ? 'They will not be able to sign in until the login is activated again. Their records are kept.'
              : 'They will be able to sign in again.'
        }
        confirmLabel={
          confirm === 'reset'
            ? 'Reset password'
            : isActive
              ? 'Deactivate'
              : 'Activate'
        }
        destructive={confirm === 'status' && isActive}
        onConfirm={run}
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
