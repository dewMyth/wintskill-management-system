import { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { Toaster } from '@/components/ui/sonner';
import { loggedOut } from '@/features/auth/actions';
import { supabase } from '@/lib/supabase';
import { router } from './router';
import { useAppDispatch, useAppSelector } from './store';

export function App() {
  const theme = useAppSelector((s) => s.ui.theme);
  const dispatch = useAppDispatch();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Signing out in another tab, or an expired refresh token, ends the session here too.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') dispatch(loggedOut());
    });
    return () => data.subscription.unsubscribe();
  }, [dispatch]);

  return (
    <>
      <RouterProvider router={router} />
      <Toaster theme={theme} position="top-center" />
    </>
  );
}
