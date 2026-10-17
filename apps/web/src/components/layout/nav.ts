import {
  LayoutDashboardIcon,
  UserRoundIcon,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from '@/features/auth/types';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

/** Navigation per role. Later phases add their pages here. */
export const navItems: Record<Role, NavItem[]> = {
  ADMIN: [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboardIcon },
    { to: '/account', label: 'Account', icon: UserRoundIcon },
  ],
  TEACHER: [
    { to: '/teacher', label: 'Dashboard', icon: LayoutDashboardIcon },
    { to: '/account', label: 'Account', icon: UserRoundIcon },
  ],
  STUDENT: [
    { to: '/student', label: 'Home', icon: LayoutDashboardIcon },
    { to: '/account', label: 'Account', icon: UserRoundIcon },
  ],
};
