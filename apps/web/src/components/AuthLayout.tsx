import type { ReactNode } from 'react';

/** Brand backdrop for the signed-out screens: logo on forest green, form card below. */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center bg-linear-to-b from-[var(--forest-950)] via-[var(--forest-900)] to-[var(--forest-700)] px-4 py-10 sm:justify-center">
      <img
        src="/logo.png"
        alt="Wint Academy logo"
        width={128}
        height={128}
        className="size-28 sm:size-32"
      />
      <p className="mb-6 font-script text-4xl text-rose-gold">
        Wintskill Academy
      </p>
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
