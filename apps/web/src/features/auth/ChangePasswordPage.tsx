import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { errorMessage } from '@/services/api';
import { useChangePasswordMutation, useLazyMeQuery } from './auth-api';
import { PasswordInput } from './PasswordInput';
import { homePath } from './types';
import { useLogout } from './use-logout';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z
      .string()
      .min(8, 'Use at least 8 characters')
      .max(72, 'Use at most 72 characters'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ['newPassword'],
    message: 'Choose a password different from the current one',
  });
type FormValues = z.infer<typeof schema>;

export function ChangePasswordPage() {
  const user = useAppSelector((s) => s.auth.user)!;
  const navigate = useNavigate();
  const logout = useLogout();
  const [changePassword] = useChangePasswordMutation();
  const [fetchMe] = useLazyMeQuery();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = async ({ currentPassword, newPassword }: FormValues) => {
    const result = await changePassword({ currentPassword, newPassword });
    if (result.error) {
      form.setError('root', { message: errorMessage(result.error) });
      return;
    }
    await fetchMe();
    toast.success('Password changed');
    navigate(homePath(user.role), { replace: true });
  };

  return (
    <AuthLayout>
      <Card>
        <CardHeader>
          <CardTitle>
            <h1 className="text-xl">
              {user.mustChangePassword
                ? 'Set your password'
                : 'Change password'}
            </h1>
          </CardTitle>
          <CardDescription>
            {user.mustChangePassword
              ? 'You signed in with a temporary password. Choose your own to continue.'
              : `Signed in as ${user.username}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <FieldGroup>
              <Field data-invalid={!!errors.currentPassword}>
                <FieldLabel htmlFor="currentPassword">
                  {user.mustChangePassword
                    ? 'Temporary password'
                    : 'Current password'}
                </FieldLabel>
                <PasswordInput
                  id="currentPassword"
                  autoComplete="current-password"
                  aria-invalid={!!errors.currentPassword}
                  {...form.register('currentPassword')}
                />
                <FieldError errors={[errors.currentPassword]} />
              </Field>
              <Field data-invalid={!!errors.newPassword}>
                <FieldLabel htmlFor="newPassword">New password</FieldLabel>
                <PasswordInput
                  id="newPassword"
                  autoComplete="new-password"
                  aria-invalid={!!errors.newPassword}
                  {...form.register('newPassword')}
                />
                <FieldDescription>At least 8 characters.</FieldDescription>
                <FieldError errors={[errors.newPassword]} />
              </Field>
              <Field data-invalid={!!errors.confirmPassword}>
                <FieldLabel htmlFor="confirmPassword">
                  Confirm new password
                </FieldLabel>
                <PasswordInput
                  id="confirmPassword"
                  autoComplete="new-password"
                  aria-invalid={!!errors.confirmPassword}
                  {...form.register('confirmPassword')}
                />
                <FieldError errors={[errors.confirmPassword]} />
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
                Save password
              </Button>
              {user.mustChangePassword ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 w-full"
                  onClick={logout}
                >
                  Log out
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 w-full"
                  onClick={() => navigate(-1)}
                >
                  Cancel
                </Button>
              )}
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
