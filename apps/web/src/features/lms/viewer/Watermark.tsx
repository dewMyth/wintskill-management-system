const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/** Repeated "name · registration number · date" over the content, so any copy can be traced. */
export function Watermark({
  name,
  reference,
  date,
}: {
  name: string;
  reference: string;
  date: string;
}) {
  const text = `${name} · ${reference} · ${dateFormat.format(new Date(date))}`;
  return (
    <div
      aria-hidden
      data-testid="watermark"
      className="pointer-events-none absolute inset-0 z-10 grid grid-cols-2 content-around overflow-hidden select-none sm:grid-cols-3"
    >
      {Array.from({ length: 18 }, (_, i) => (
        <span
          key={i}
          className="-rotate-30 py-10 text-center text-sm font-semibold whitespace-nowrap text-foreground/15"
        >
          {text}
        </span>
      ))}
    </div>
  );
}
