export { cn } from 'cn';

/** "Kavindi Sewwandi Silva" -> "KS" */
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
