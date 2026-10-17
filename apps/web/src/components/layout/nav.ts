import {
  BookOpenIcon,
  LayoutDashboardIcon,
  UserRoundIcon,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from '@/features/auth/types';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Highlight only on this exact URL (home pages), not on sub-pages. */
  end?: boolean;
}

/** Navigation per role. Later phases add their pages here. */
export const navItems: Record<Role, NavItem[]> = {
  ADMIN: [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboardIcon, end: true },
    { to: '/admin/courses', label: 'Courses', icon: BookOpenIcon },
    { to: '/account', label: 'Account', icon: UserRoundIcon },
  ],
  TEACHER: [
    {
      to: '/teacher',
      label: 'Dashboard',
      icon: LayoutDashboardIcon,
      end: true,
    },
    { to: '/account', label: 'Account', icon: UserRoundIcon },
  ],
  STUDENT: [
    { to: '/student', label: 'Home', icon: LayoutDashboardIcon, end: true },
    { to: '/account', label: 'Account', icon: UserRoundIcon },
  ],
};
