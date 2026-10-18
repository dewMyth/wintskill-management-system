import {
  KeyRoundIcon,
  LogOutIcon,
  MoonIcon,
  SunIcon,
  UserRoundIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { persistor, useAppDispatch, useAppSelector } from '@/app/store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLogout } from '@/features/auth/use-logout';
import { themeChanged } from '@/features/ui/ui-slice';
import { initials } from '@/lib/utils';

export function UserMenu() {
  const user = useAppSelector((s) => s.auth.user)!;
  const theme = useAppSelector((s) => s.ui.theme);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const logout = useLogout();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-11 rounded-full"
          aria-label="Open user menu"
        >
          <Avatar className="size-9" aria-hidden>
            {user.avatarUrl && (
              <AvatarImage
                src={user.avatarUrl}
                alt=""
                className="object-cover"
              />
            )}
            <AvatarFallback className="bg-gold text-[var(--forest-950)] font-semibold">
              {initials(user.fullName)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate font-medium">{user.fullName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {user.username}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="min-h-11"
          onSelect={() => navigate('/account')}
        >
          <UserRoundIcon /> Account
        </DropdownMenuItem>
        <DropdownMenuItem
          className="min-h-11"
          onSelect={() => navigate('/change-password')}
        >
          <KeyRoundIcon /> Change password
        </DropdownMenuItem>
        <DropdownMenuItem
          className="min-h-11"
          onSelect={() => {
            dispatch(themeChanged(theme === 'dark' ? 'light' : 'dark'));
            void persistor.flush(); // save at once, so a quick refresh keeps it
          }}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="min-h-11"
          variant="destructive"
          onSelect={logout}
        >
          <LogOutIcon /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
