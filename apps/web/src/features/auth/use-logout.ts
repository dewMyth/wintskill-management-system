import { useAppDispatch } from '@/app/store';
import { supabase } from '@/lib/supabase';
import { api } from '@/services/api';
import { loggedOut } from './actions';

export function useLogout() {
  const dispatch = useAppDispatch();
  return async () => {
    await supabase.auth.signOut();
    dispatch(loggedOut());
    dispatch(api.util.resetApiState());
  };
}
