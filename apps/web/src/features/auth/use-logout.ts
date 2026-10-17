import { persistor, useAppDispatch } from '@/app/store';
import { supabase } from '@/lib/supabase';
import { api } from '@/services/api';
import { loggedOut } from './actions';

/** Clears the local session first (instant, and saved at once), then ends the Supabase session. */
export function useLogout() {
  const dispatch = useAppDispatch();
  return async () => {
    dispatch(loggedOut());
    dispatch(api.util.resetApiState());
    await persistor.flush();
    await supabase.auth.signOut();
  };
}
