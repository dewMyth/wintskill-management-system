import { createClient } from '@supabase/supabase-js';

/** Used only for sign-in and session refresh. All data goes through our API. */
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);

const SEP = '[\\s./-]+';
/** A registration number as typed: WINT/BB/2026/03/092, bb-2026-3-92, ... (same rule as the API). */
const TYPED_REGISTRATION_NO = new RegExp(
  `^(?:wint${SEP})?([a-z]{2,6})${SEP}(\\d{4})${SEP}(\\d{1,2})${SEP}(\\d{1,4})$`,
  'i',
);

/** The stored form of a typed username: WINT/BB/2026/03/092 for students, lower case for staff. */
export function canonicalUsername(typed: string) {
  const m = TYPED_REGISTRATION_NO.exec(typed.trim());
  if (!m) return typed.trim().toLowerCase();
  const [, course, year, intake, seq] = m;
  return `WINT/${course.toUpperCase()}/${year}/${intake.padStart(2, '0')}/${seq.padStart(3, '0')}`;
}

/**
 * Supabase Auth needs an email; users log in with a username, so we derive a hidden one.
 * WINT/BB/2026/03/092 -> wint.bb.2026.03.092@users.wintskill.local
 */
export const internalEmail = (username: string) =>
  `${canonicalUsername(username).toLowerCase().replaceAll('/', '.')}@users.wintskill.local`;
