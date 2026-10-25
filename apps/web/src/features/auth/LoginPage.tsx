import { zodResolver } from '@hookform/resolvers/zod';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation } from 'react-router';
import { z } from 'zod';
import { useAppSelector } from '@/app/store';
import { AuthLayout } from '@/components/AuthLayout';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { internalEmail, supabase } from '@/lib/supabase';
import { errorMessage } from '@/services/api';
import { useLazyMeQuery } from './auth-api';
import { PasswordInput } from './PasswordInput';
import { homePath } from './types';

const schema = z.object({
  username: z.string().trim().min(1, 'Enter your username'),
  password: z.string().min(1, 'Enter your password'),
});
type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const user = useAppSelector((s) => s.auth.user);
  const from = (useLocation().state as { from?: string } | null)?.from;
  const [fetchMe] = useLazyMeQuery();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', password: '' },
  });
  const { errors, isSubmitting } = form.formState;

  // Signing in stores the profile, which re-renders this page into the right redirect.
  if (user) {
    const target = user.mustChangePassword
      ? '/change-password'
      : (from ?? homePath(user.role));
    return <Navigate to={target} replace />;
  }

  const onSubmit = async ({ username, password }: FormValues) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: internalEmail(username),
      password,
    });
    if (error) {
      form.setError('root', {
        message:
          error.status === 400
            ? 'Incorrect username or password'
            : 'Could not sign in. Please try again.',
      });
      return;
    }
    const result = await fetchMe();
    if (!result.data) {
      // A 401 here means there is no active profile for this login (the API already signed it out).
      const inactive =
        (result.error as FetchBaseQueryError | undefined)?.status === 401;
      if (!inactive) await supabase.auth.signOut({ scope: 'local' });
      form.setError('root', {
        message: inactive
          ? 'This account is not active. Please contact the academy.'
          : errorMessage(result.error),
      });
    }
  };

  return (
    <AuthLayout>
      <Card>
        <CardHeader>
          <CardTitle>
            <h1 className="text-xl">Sign in</h1>
          </CardTitle>
          <CardDescription>
            Students sign in with their registration number.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <FieldGroup>
              <Field data-invalid={!!errors.username}>
                <FieldLabel htmlFor="username">Username</FieldLabel>
                <Input
                  id="username"
                  autoComplete="username"
                  autoCapitalize="characters"
                  placeholder="e.g. WINT/HD/2026/01/001"
                  className="h-11"
                  aria-invalid={!!errors.username}
                  {...form.register('username')}
                />
                <FieldError errors={[errors.username]} />
              </Field>
              <Field data-invalid={!!errors.password}>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <PasswordInput
                  id="password"
                  autoComplete="current-password"
                  aria-invalid={!!errors.password}
                  {...form.register('password')}
                />
                <FieldError errors={[errors.password]} />
              </Field>
              {errors.root && (
                <p role="alert" className="text-sm text-destructive">
                  {errors.root.message}
                </p>
              )}
              <Button
                type="submit"
                size="lg"
                className="h-11 w-full"
                disabled={isSubmitting}
              >
                {isSubmitting && <Spinner />}
                Sign in
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Forgot your password? Ask the academy office to reset it.
              </p>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
