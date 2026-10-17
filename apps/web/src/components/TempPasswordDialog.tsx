import { CopyIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username: string;
  password: string;
}

/** Shows new login details once. The password cannot be viewed again after closing. */
export function TempPasswordDialog({
  open,
  onOpenChange,
  username,
  password,
}: Props) {
  const copy = async () => {
    await navigator.clipboard.writeText(
      `Username: ${username}\nPassword: ${password}`,
    );
    toast.success('Login details copied');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Login details</DialogTitle>
          <DialogDescription>
            Share these with the user now. The temporary password is shown only
            once; they must change it when they first sign in.
          </DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-lg bg-muted p-4 font-mono text-base">
          <dt className="text-muted-foreground">Username</dt>
          <dd className="break-all">{username}</dd>
          <dt className="text-muted-foreground">Password</dt>
          <dd className="break-all">{password}</dd>
        </dl>
        <DialogFooter>
          <Button variant="outline" className="min-h-11" onClick={copy}>
            <CopyIcon /> Copy
          </Button>
          <Button className="min-h-11" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
