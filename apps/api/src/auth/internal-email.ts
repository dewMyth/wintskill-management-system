import { canonicalUsername } from '../accounts/usernames.js';

/**
 * Supabase Auth needs an email; users log in with a username, so we derive a hidden one.
 * WINT/BB/2026/03/092 -> wint.bb.2026.03.092@users.wintskill.local
 */
export const internalEmail = (username: string) =>
  `${canonicalUsername(username).toLowerCase().replaceAll('/', '.')}@users.wintskill.local`;
