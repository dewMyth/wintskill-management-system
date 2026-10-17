import {
  BookOpenIcon,
  CalendarDaysIcon,
  ClipboardCheckIcon,
  GraduationCapIcon,
  LayoutDashboardIcon,
  UserRoundIcon,
  UsersIcon,
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
    { to: '/admin/students', label: 'Students', icon: UsersIcon },
    { to: '/admin/calendar', label: 'Calendar', icon: CalendarDaysIcon },
    { to: '/admin/attendance', label: 'Attendance', icon: ClipboardCheckIcon },
    { to: '/admin/courses', label: 'Courses', icon: BookOpenIcon },
    { to: '/admin/teachers', label: 'Teachers', icon: GraduationCapIcon },
  ],
  TEACHER: [
    {
      to: '/teacher',
      label: 'Dashboard',
      icon: LayoutDashboardIcon,
      end: true,
    },
    { to: '/teacher/calendar', label: 'Calendar', icon: CalendarDaysIcon },
    {
      to: '/teacher/attendance',
      label: 'Attendance',
      icon: ClipboardCheckIcon,
    },
    { to: '/account', label: 'Account', icon: UserRoundIcon },
  ],
  STUDENT: [
    { to: '/student', label: 'Home', icon: LayoutDashboardIcon, end: true },
    { to: '/student/calendar', label: 'Calendar', icon: CalendarDaysIcon },
    { to: '/account', label: 'Account', icon: UserRoundIcon },
  ],
};
