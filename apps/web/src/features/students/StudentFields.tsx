import { PlusIcon, XIcon } from 'lucide-react';
import { useFieldArray, useWatch, type UseFormReturn } from 'react-hook-form';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Field,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { StudentFormValues } from './student-form';

type Form = UseFormReturn<StudentFormValues>;

/** Items 1, 2, 4, 5 and 6 of the admission form. */
export function PersonalFields({ form }: { form: Form }) {
  const { register, formState } = form;
  const { errors } = formState;
  return (
    <>
      <TextField
        id="fullName"
        label="Full name"
        autoComplete="off"
        error={errors.fullName}
        {...register('fullName')}
      />
      <TextField
        id="nameWithInitials"
        label="Name with initials"
        placeholder="e.g. K. S. Silva"
        error={errors.nameWithInitials}
        {...register('nameWithInitials')}
      />
      <TextField
        id="nicOrPassport"
        label="NIC or passport number"
        autoCapitalize="characters"
        className="h-11 uppercase"
        error={errors.nicOrPassport}
        {...register('nicOrPassport')}
      />
      <TextField
        id="dateOfBirth"
        type="date"
        label="Date of birth"
        error={errors.dateOfBirth}
        {...register('dateOfBirth')}
      />
      <TextField
        id="schoolAttended"
        label="School attended (optional)"
        error={errors.schoolAttended}
        {...register('schoolAttended')}
      />
    </>
  );
}

/** Items 3, 7, 8 and 9 of the admission form. */
export function ContactFields({ form }: { form: Form }) {
  const { register, formState } = form;
  const { errors } = formState;
  return (
    <>
      <TextField
        id="address"
        label="Address"
        error={errors.address}
        {...register('address')}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id="mobilePhone"
          type="tel"
          label="Mobile number"
          autoComplete="off"
          error={errors.mobilePhone}
          {...register('mobilePhone')}
        />
        <TextField
          id="landPhone"
          type="tel"
          label="Land number (optional)"
          error={errors.landPhone}
          {...register('landPhone')}
        />
      </div>
      <TextField
        id="email"
        type="email"
        label="Email (optional)"
        description="For contact only. Students sign in with their registration number."
        error={errors.email}
        {...register('email')}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id="guardianName"
          label="Guardian's name (optional)"
          error={errors.guardianName}
          {...register('guardianName')}
        />
        <TextField
          id="guardianPhone"
          type="tel"
          label="Guardian's contact (optional)"
          error={errors.guardianPhone}
          {...register('guardianPhone')}
        />
      </div>
    </>
  );
}

function QualificationFields({
  form,
  level,
}: {
  form: Form;
  level: 'ol' | 'al';
}) {
  const label =
    level === 'ol' ? 'Ordinary Level (O/L)' : 'Advanced Level (A/L)';
  const short = level === 'ol' ? 'O/L' : 'A/L';
  const { register, control, setValue, formState } = form;
  const errors = formState.errors[level];
  const enabled = useWatch({ control, name: `${level}.enabled` });
  const rows = useFieldArray({ control, name: `${level}.subjects` });

  return (
    <FieldSet>
      <FieldLegend>{label}</FieldLegend>
      <Field orientation="horizontal">
        <Checkbox
          id={`${level}-enabled`}
          className="size-5"
          checked={enabled}
          onCheckedChange={(checked) =>
            setValue(`${level}.enabled`, checked === true, {
              shouldDirty: true,
            })
          }
        />
        <FieldLabel
          htmlFor={`${level}-enabled`}
          className="min-h-11 font-normal"
        >
          Add {short} results
        </FieldLabel>
      </Field>
      {enabled && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <TextField
              id={`${level}-year`}
              label="Year"
              inputMode="numeric"
              maxLength={4}
              error={errors?.year}
              {...register(`${level}.year`)}
            />
            <TextField
              id={`${level}-index`}
              label="Index number"
              error={errors?.indexNo}
              {...register(`${level}.indexNo`)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-[1fr_5rem_2.75rem] gap-2 text-sm font-medium">
              <span>Subject</span>
              <span>Result</span>
            </div>
            {rows.fields.map((row, i) => {
              const rowErrors = errors?.subjects?.[i];
              return (
                <div
                  key={row.id}
                  className="grid grid-cols-[1fr_5rem_2.75rem] items-start gap-2"
                >
                  <Input
                    aria-label={`${short} subject ${i + 1}`}
                    aria-invalid={!!rowErrors?.subject}
                    className="h-11"
                    {...register(`${level}.subjects.${i}.subject`)}
                  />
                  <Input
                    aria-label={`${short} result ${i + 1}`}
                    aria-invalid={!!rowErrors?.result}
                    className="h-11 uppercase"
                    maxLength={5}
                    {...register(`${level}.subjects.${i}.result`)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-11"
                    aria-label={`Remove ${short} subject ${i + 1}`}
                    onClick={() => rows.remove(i)}
                  >
                    <XIcon />
                  </Button>
                  {(rowErrors?.subject || rowErrors?.result) && (
                    <p className="col-span-3 text-sm text-destructive">
                      {rowErrors.subject?.message ?? rowErrors.result?.message}
                    </p>
                  )}
                </div>
              );
            })}
            {rows.fields.length < 15 && (
              <Button
                type="button"
                variant="outline"
                className="min-h-11 self-start"
                onClick={() => rows.append({ subject: '', result: '' })}
              >
                <PlusIcon /> Add subject
              </Button>
            )}
          </div>
        </>
      )}
    </FieldSet>
  );
}

/** "Education Qualification" section of the admission form. Both levels are optional. */
export function EducationFields({ form }: { form: Form }) {
  return (
    <>
      <QualificationFields form={form} level="ol" />
      <QualificationFields form={form} level="al" />
    </>
  );
}
