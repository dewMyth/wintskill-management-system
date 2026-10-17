import { zodResolver } from '@hookform/resolvers/zod';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CopyIcon,
  SearchIcon,
  UserCheckIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { PageHeader } from '@/components/PageHeader';
import { PhotoPicker } from '@/components/PhotoPicker';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { FieldGroup } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { useUploadPhotoMutation } from '@/features/accounts/accounts-api';
import { IntakePicker } from '@/features/courses/IntakePicker';
import { errorMessage } from '@/services/api';
import {
  emptyStudentForm,
  stepFields,
  studentSchema,
  toPayload,
  type StudentFormValues,
} from './student-form';
import {
  ContactFields,
  EducationFields,
  PersonalFields,
} from './StudentFields';
import {
  useEnrollStudentMutation,
  useLazyFindStudentByNicQuery,
  useRegisterStudentMutation,
} from './students-api';
import type { StudentSummary } from './types';

const steps = [
  { key: 'personal', title: 'Personal details' },
  { key: 'contact', title: 'Contact details' },
  { key: 'education', title: 'Education qualifications' },
  { key: 'enrollment', title: 'Course' },
] as const;

interface Done {
  studentId: string;
  registrationNo: string;
  username: string;
  /** Only for new students: returning students keep their login. */
  temporaryPassword?: string;
}

/** Follows the paper admission form. Starts by checking whether the student is already registered. */
export function RegisterStudentPage() {
  const [nic, setNic] = useState('');
  const [existing, setExisting] = useState<StudentSummary>();
  const [step, setStep] = useState<number>(-1); // -1 = find by NIC
  const [batchId, setBatchId] = useState('');
  const [batchError, setBatchError] = useState<string>();
  const [photo, setPhoto] = useState<File>();
  const [done, setDone] = useState<Done>();
  const [submitError, setSubmitError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const photoPreview = useMemo(
    () => photo && URL.createObjectURL(photo),
    [photo],
  );
  useEffect(
    () => () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    },
    [photoPreview],
  );

  const [findByNic, { isFetching: finding }] = useLazyFindStudentByNicQuery();
  const [registerStudent] = useRegisterStudentMutation();
  const [enrollStudent] = useEnrollStudentMutation();
  const [uploadPhoto] = useUploadPhotoMutation();
  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: emptyStudentForm(),
  });

  const restart = () => {
    setNic('');
    setExisting(undefined);
    setStep(-1);
    setBatchId('');
    setPhoto(undefined);
    setDone(undefined);
    setSubmitError(undefined);
    form.reset(emptyStudentForm());
  };

  const find = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = nic.trim().toUpperCase();
    if (!/^[A-Z0-9]{5,20}$/.test(value)) {
      toast.error('Enter an NIC or passport number');
      return;
    }
    const result = await findByNic(value);
    if (result.data) {
      setExisting(result.data);
    } else if (
      (result.error as FetchBaseQueryError | undefined)?.status === 404
    ) {
      form.setValue('nicOrPassport', value);
      setStep(0);
    } else {
      toast.error(errorMessage(result.error));
    }
  };

  const next = async () => {
    const key = steps[step].key;
    if (key !== 'enrollment' && !(await form.trigger(stepFields[key]))) return;
    setStep(step + 1);
    window.scrollTo({ top: 0 });
  };

  const submit = async () => {
    if (!batchId) {
      setBatchError('Choose a course intake');
      return;
    }
    setSubmitting(true);
    setSubmitError(undefined);
    if (existing) {
      const result = await enrollStudent({ id: existing.id, batchId });
      setSubmitting(false);
      if (result.error) setSubmitError(errorMessage(result.error));
      else
        setDone({
          studentId: existing.id,
          registrationNo: result.data.registrationNo,
          username: existing.username,
        });
      return;
    }
    if (!(await form.trigger())) {
      setSubmitting(false);
      setSubmitError('Some details are missing. Go back and check each step.');
      return;
    }
    const result = await registerStudent({
      ...toPayload(studentSchema.parse(form.getValues())),
      batchId,
    });
    if (result.error) {
      setSubmitting(false);
      setSubmitError(errorMessage(result.error));
      return;
    }
    if (photo) {
      const upload = await uploadPhoto({
        profileId: result.data.profileId,
        file: photo,
      });
      if (upload.error)
        toast.error(
          `Student registered, but the photo was not saved: ${errorMessage(upload.error)}`,
        );
    }
    setSubmitting(false);
    setDone(result.data);
  };

  const back = (
    <Button asChild variant="ghost" className="mb-2 min-h-11 -ml-3">
      <Link to=".." relative="path">
        <ArrowLeftIcon /> Students
      </Link>
    </Button>
  );

  if (done) return <RegistrationDone done={done} onAnother={restart} />;

  // Step 0: is this student already registered?
  if (step === -1 && !existing) {
    return (
      <>
        {back}
        <PageHeader
          title="Register a student"
          description="Start with the NIC or passport number from the form."
        />
        <Card className="max-w-xl">
          <CardContent>
            <form onSubmit={find} noValidate>
              <FieldGroup>
                <TextField
                  id="find-nic"
                  label="NIC or passport number"
                  autoCapitalize="characters"
                  autoFocus
                  className="h-11 uppercase"
                  value={nic}
                  onChange={(e) => setNic(e.target.value)}
                />
                <Button
                  type="submit"
                  className="min-h-11 self-start"
                  disabled={finding}
                >
                  {finding ? <Spinner /> : <SearchIcon />}
                  Continue
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </>
    );
  }

  // Returning student: only choose the new course.
  if (existing) {
    return (
      <>
        {back}
        <PageHeader title="Enroll in another course" />
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheckIcon className="size-5 text-primary" /> Already
              registered
            </CardTitle>
            <CardDescription>
              {existing.fullName} · signs in as{' '}
              <span className="font-mono">{existing.username}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <ul className="flex flex-wrap gap-2 text-sm">
                {existing.enrollments.map((e) => (
                  <li
                    key={e.registrationNo}
                    className="rounded-md bg-muted px-2 py-1"
                  >
                    <span className="font-mono">{e.registrationNo}</span> ·{' '}
                    {e.course.name}
                  </li>
                ))}
              </ul>
              <IntakePicker
                id="batch"
                value={batchId}
                onChange={(v) => {
                  setBatchId(v);
                  setBatchError(undefined);
                }}
                exclude={existing.enrollments.map((e) => e.batchId)}
                error={batchError}
              />
              <p className="text-sm text-muted-foreground">
                They get a new registration number for this course and keep
                signing in as {existing.username}.
              </p>
              {submitError && (
                <p role="alert" className="text-sm text-destructive">
                  {submitError}
                </p>
              )}
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  className="min-h-11"
                  onClick={restart}
                >
                  Different student
                </Button>
                <Button
                  className="min-h-11"
                  onClick={submit}
                  disabled={submitting}
                >
                  {submitting && <Spinner />}
                  Enroll student
                </Button>
              </div>
            </FieldGroup>
          </CardContent>
        </Card>
      </>
    );
  }

  const current = steps[step];
  const last = step === steps.length - 1;
  return (
    <>
      {back}
      <PageHeader title="Register a student" />
      <Card className="max-w-2xl">
        <CardHeader>
          <p className="text-sm text-muted-foreground">
            Step {step + 1} of {steps.length}
          </p>
          <CardTitle>
            <h2 className="text-lg">{current.title}</h2>
          </CardTitle>
          <div className="flex gap-1" aria-hidden>
            {steps.map((s, i) => (
              <span
                key={s.key}
                className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-primary' : 'bg-muted'}`}
              />
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => e.preventDefault()} noValidate>
            <FieldGroup>
              {current.key === 'personal' && (
                <>
                  <PhotoPicker
                    name={form.getValues('fullName')}
                    photoUrl={photoPreview}
                    onChange={setPhoto}
                  />
                  <PersonalFields form={form} />
                </>
              )}
              {current.key === 'contact' && <ContactFields form={form} />}
              {current.key === 'education' && <EducationFields form={form} />}
              {current.key === 'enrollment' && (
                <IntakePicker
                  id="batch"
                  value={batchId}
                  onChange={(v) => {
                    setBatchId(v);
                    setBatchError(undefined);
                  }}
                  error={batchError}
                />
              )}
              {submitError && (
                <p role="alert" className="text-sm text-destructive">
                  {submitError}
                </p>
              )}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  onClick={() => (step === 0 ? restart() : setStep(step - 1))}
                >
                  <ArrowLeftIcon /> Back
                </Button>
                {last ? (
                  <Button
                    type="button"
                    className="min-h-11"
                    onClick={submit}
                    disabled={submitting}
                  >
                    {submitting && <Spinner />}
                    Register student
                  </Button>
                ) : (
                  <Button type="button" className="min-h-11" onClick={next}>
                    Next <ArrowRightIcon />
                  </Button>
                )}
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </>
  );
}

function RegistrationDone({
  done,
  onAnother,
}: {
  done: Done;
  onAnother: () => void;
}) {
  const navigate = useNavigate();
  const copy = async () => {
    await navigator.clipboard.writeText(
      `Username: ${done.username}\nPassword: ${done.temporaryPassword}`,
    );
    toast.success('Login details copied');
  };

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>
          <h1 className="text-xl">
            {done.temporaryPassword ? 'Student registered' : 'Student enrolled'}
          </h1>
        </CardTitle>
        <CardDescription>
          Write the registration number on the admission form.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="rounded-xl bg-primary p-4 text-center text-primary-foreground">
          <p className="text-sm opacity-80">Registration number</p>
          <p
            className="font-mono text-3xl font-semibold tracking-wide"
            data-testid="registration-no"
          >
            {done.registrationNo}
          </p>
        </div>
        {done.temporaryPassword ? (
          <>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-lg bg-muted p-4 font-mono text-base">
              <dt className="text-muted-foreground">Username</dt>
              <dd className="break-all">{done.username}</dd>
              <dt className="text-muted-foreground">Password</dt>
              <dd className="break-all" data-testid="temporary-password">
                {done.temporaryPassword}
              </dd>
            </dl>
            <p className="text-sm text-muted-foreground">
              Give these to the student now. The temporary password is shown
              only once; they choose their own when they first sign in.
            </p>
            <Button variant="outline" className="min-h-11" onClick={copy}>
              <CopyIcon /> Copy login details
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            They keep signing in as{' '}
            <span className="font-mono">{done.username}</span> with their
            current password.
          </p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            className="min-h-11"
            onClick={() =>
              navigate(`../${done.studentId}`, { relative: 'path' })
            }
          >
            View student
          </Button>
          <Button variant="outline" className="min-h-11" onClick={onAnother}>
            Register another
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
