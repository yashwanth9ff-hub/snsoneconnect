'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [state, setState] = useState({ loading: true, profile: null });
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadProfile(session) {
      if (!session) {
        if (active) setState({ loading: false, profile: null });
        return;
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, department_id, year, register_no, is_active, department:departments(code, name)')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!active) return;
      if (error) {
        setAuthError('Could not load your profile. Check your connection and sign in again.');
        setState({ loading: false, profile: null });
        return;
      }
      if (!data) {
        setAuthError('Your account is not set up yet. Please contact the college office.');
        await supabase.auth.signOut();
        setState({ loading: false, profile: null });
        return;
      }
      if (!data.is_active) {
        setAuthError('This account is inactive. Please contact the college office.');
        await supabase.auth.signOut();
        setState({ loading: false, profile: null });
        return;
      }
      setAuthError('');
      setState({ loading: false, profile: data });
    }

    // Do not call supabase from inside the callback directly (can deadlock), so defer it.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => loadProfile(session), 0);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const clearAuthError = useCallback(() => setAuthError(''), []);

  const value = useMemo(
    () => ({ ...state, authError, signOut, clearAuthError }),
    [state, authError, signOut, clearAuthError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
