import { Transform } from 'class-transformer';

/** Trims strings and upper-cases them, e.g. codes typed in lower case. */
export const ToUpperCase = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  );

export const Trim = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );
