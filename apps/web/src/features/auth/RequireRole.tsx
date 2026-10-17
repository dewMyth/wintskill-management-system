import { Navigate, Outlet, useLocation } from 'react-router';
import { useAppSelector } from '@/app/store';
import { homePath, type Role } from './types';

interface Props {
  /** Leave out to allow any signed-in user. */
  role?: Role;
  /** The change-password page itself must stay reachable. */
  allowPendingPassword?: boolean;
}

export function RequireRole({ role, allowPendingPassword }: Props) {
  const user = useAppSelector((s) => s.auth.user);
  const location = useLocation();

  if (!user)
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.mustChangePassword && !allowPendingPassword)
    return <Navigate to="/change-password" replace />;
  if (role && user.role !== role)
    return <Navigate to={homePath(user.role)} replace />;
  return <Outlet />;
}
