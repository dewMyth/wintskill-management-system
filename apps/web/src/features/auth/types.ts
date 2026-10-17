export type Role = 'ADMIN' | 'TEACHER' | 'STUDENT';

export interface Profile {
  id: string;
  role: Role;
  username: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  avatarPath: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
}

const homePaths: Record<Role, string> = {
  ADMIN: '/admin',
  TEACHER: '/teacher',
  STUDENT: '/student',
};

export const homePath = (role: Role) => homePaths[role];
