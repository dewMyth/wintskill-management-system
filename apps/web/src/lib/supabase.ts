import { createClient } from '@supabase/supabase-js';

/** Used only for sign-in and session refresh. All data goes through our API. */
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);

/** Supabase Auth needs an email; users log in with a username, so we derive a hidden one. */
export const internalEmail = (username: string) =>
  `${username.trim().toLowerCase()}@users.wintskill.local`;
