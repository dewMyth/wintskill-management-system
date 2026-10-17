/** Supabase Auth needs an email; users log in with a username, so we derive a hidden one. */
export const internalEmail = (username: string) =>
  `${username.trim().toLowerCase()}@users.wintskill.local`;
