'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const SELECT = `
  id, tracking_id, reason, needed_by, status, created_at, updated_at, resolved_at,
  source_announcement_id, department_id,
  request_type:request_types(name, description),
  department:departments(code, name),
  student:profiles!student_id(full_name, register_no, year, department:departments(code)),
  assignee:profiles!assigned_to(full_name),
  history:request_status_history(id, from_status, to_status, note, created_at,
    changer:profiles!changed_by(full_name, role))
`;

// Loads one request with its history and keeps it fresh (realtime + slow poll fallback).
export function useRequest(id) {
  const [state, setState] = useState({ loading: true, error: '', notFound: false, data: null });

  const load = useCallback(
    async (silent) => {
      if (!silent) setState((s) => ({ ...s, loading: true, error: '' }));
      const { data, error } = await supabase.from('requests').select(SELECT).eq('id', id).maybeSingle();
      if (error) {
        if (!silent) setState({ loading: false, error: error.message, notFound: false, data: null });
        return;
      }
      if (!data) {
        setState({ loading: false, error: '', notFound: true, data: null });
        return;
      }
      setState({ loading: false, error: '', notFound: false, data });
    },
    [id]
  );

  useEffect(() => {
    load(false);
    const channel = supabase
      .channel(`request-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'requests', filter: `id=eq.${id}` }, () => load(true))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'request_status_history', filter: `request_id=eq.${id}` }, () => load(true))
      .subscribe();
    const timer = setInterval(() => load(true), 10000);
    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [id, load]);

  return { ...state, reload: () => load(true) };
}
