import type { Profile } from '@/features/auth/types';

export const profile = (overrides: Partial<Profile> = {}): Profile => ({
  id: 'user-1',
  role: 'STUDENT',
  username: 'WINT/HD/2026/01/001',
  fullName: 'Kavindi Silva',
  email: null,
  phone: null,
  avatarPath: null,
  isActive: true,
  mustChangePassword: false,
  ...overrides,
});

export const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
