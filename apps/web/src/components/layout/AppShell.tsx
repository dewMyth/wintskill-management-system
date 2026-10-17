import {
  EllipsisIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
} from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { useAppDispatch, useAppSelector } from '@/app/store';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useMeQuery } from '@/features/auth/auth-api';
import { sidebarToggled } from '@/features/ui/ui-slice';
import { cn } from '@/lib/utils';
import { navItems } from './nav';
import { UserMenu } from './UserMenu';

const tabClass =
  'flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground';

/** Mobile: top bar + bottom tab bar. From md: collapsible sidebar. */
export function AppShell() {
  const role = useAppSelector((s) => s.auth.user!.role);
  const collapsed = useAppSelector((s) => s.ui.sidebarCollapsed);
  const dispatch = useAppDispatch();
  // Refresh the profile once per visit: new photo link, and sign-out if the account was deactivated.
  useMeQuery();
  const items = navItems[role];
  // Phones show at most 5 tabs; the rest go under "More".
  const tabs = items.length > 5 ? items.slice(0, 4) : items;
  const more = items.slice(tabs.length);
  const { pathname } = useLocation();
  const moreActive = more.some(({ to }) => pathname.startsWith(to));

  return (
    <div className="flex min-h-dvh">
      <aside
        className={cn(
          'sticky top-0 hidden h-dvh shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-[width] md:flex',
          collapsed ? 'w-18' : 'w-64',
        )}
      >
        <div className="flex h-16 items-center gap-2 px-4">
          <img
            src="/logo-96.png"
            alt=""
            width={40}
            height={40}
            className="size-10 shrink-0"
          />
          {!collapsed && (
            <span className="font-script text-2xl text-rose-gold">
              Wintskill Academy
            </span>
          )}
        </div>
        <nav aria-label="Main" className="flex flex-1 flex-col gap-1 p-3">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                cn(
                  'flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors hover:bg-sidebar-accent',
                  isActive && 'bg-sidebar-accent text-sidebar-primary',
                )
              }
            >
              <Icon className="size-5 shrink-0" />
              {!collapsed && label}
            </NavLink>
          ))}
        </nav>
        <Button
          variant="ghost"
          className="m-3 min-h-11 justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
          onClick={() => dispatch(sidebarToggled())}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <PanelLeftOpenIcon className="size-5" />
          ) : (
            <PanelLeftCloseIcon className="size-5" />
          )}
          {!collapsed && 'Collapse'}
        </Button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur md:px-6">
          <img
            src="/logo-96.png"
            alt=""
            width={36}
            height={36}
            className="size-9 rounded-lg bg-[var(--forest-900)] p-0.5 md:hidden"
          />
          <span className="font-script text-2xl text-primary md:hidden">
            Wintskill
          </span>
          <div className="ml-auto">
            <UserMenu />
          </div>
        </header>
        <main className="flex-1 px-4 pt-4 pb-24 md:px-6 md:pt-6 md:pb-8">
          <Outlet />
        </main>
      </div>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(tabClass, isActive && 'text-primary')
            }
          >
            <Icon className="size-5" />
            {label}
          </NavLink>
        ))}
        {more.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(tabClass, moreActive && 'text-primary')}
            >
              <EllipsisIcon className="size-5" />
              More
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" className="w-48">
              {more.map(({ to, label, icon: Icon }) => (
                <DropdownMenuItem key={to} asChild className="min-h-11">
                  <NavLink to={to}>
                    <Icon /> {label}
                  </NavLink>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </nav>
    </div>
  );
}
