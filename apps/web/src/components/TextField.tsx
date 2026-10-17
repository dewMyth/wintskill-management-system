import type { ComponentProps } from 'react';
import type { FieldError as FormFieldError } from 'react-hook-form';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';

interface Props extends ComponentProps<typeof Input> {
  id: string;
  label: string;
  description?: string;
  error?: FormFieldError;
}

/** Label + input + help text + validation message. */
export function TextField({
  id,
  label,
  description,
  error,
  className,
  ...input
}: Props) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        aria-invalid={!!error}
        className={className ?? 'h-11'}
        {...input}
      />
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldError errors={[error]} />
    </Field>
  );
}
