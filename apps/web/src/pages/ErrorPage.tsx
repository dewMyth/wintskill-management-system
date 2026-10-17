import { Button } from '@/components/ui/button';

/** Shown when a page crashes. */
export function ErrorPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <img src="/logo-96.png" alt="" width={64} height={64} />
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="max-w-sm text-muted-foreground">
        Please reload the page. If it keeps happening, contact the academy.
      </p>
      <Button className="min-h-11" onClick={() => window.location.reload()}>
        Reload
      </Button>
    </main>
  );
}
