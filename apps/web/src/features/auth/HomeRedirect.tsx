import { Navigate } from 'react-router';
import { useAppSelector } from '@/app/store';
import { homePath } from './types';

export function HomeRedirect() {
  const role = useAppSelector((s) => s.auth.user!.role);
  return <Navigate to={homePath(role)} replace />;
}
