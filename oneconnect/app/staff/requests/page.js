'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Empty, ErrorBanner, SkeletonList, StatusBadge } from '@/components/ui';
import { ACTIVE_STATUSES, timeAgo } from '@/lib/format';

const SELECT = `
  id, tracking_id, status, created_at, updated_at,
  request_type:request_types(name),
  department:departments(code),
  student:profiles!student_id(full_name, register_no),
  assignee:profiles!assigned_to(full_name)
`;

const FILTERS = [
  ['pending', 'Pending'],
  ['all', 'All'],
  ['submitted', 'Submitted'],
  ['under_review', 'Under review'],
  ['completed', 'Ready'],
  ['rejected', 'Rejected'],
];

export default function StaffQueue() {
  const { profile } = useAuth();
  const router = useRouter();
  const isAdmin = profile?.role === 'admin';

  const [state, setState] = useState({ loading: true, error: '', items: [] });
  const [depts, setDepts] = useState([]);
  const [status, setStatus] = useState('pending');
  const [dept, setDept] = useState('all');
  const [query, setQuery] = useState('');

  const load = useCallback(async (silent) => {
    if (!silent) setState((s) => ({ ...s, loading: true, error: '' }));
    const { data, error } = await supabase
      .from('requests')
      .select(SELECT)
      .order('created_at', { ascending: true })
      .limit(300);
    if (error) {
      if (!silent) setState({ loading: false, error: error.message, items: [] });
    } else {
      setState({ loading: false, error: '', items: data });
    }
  }, []);

  useEffect(() => {
    load(false);
    const channel = supabase
      .channel('staff-requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, () => load(true))
      .subscribe();
    const timer = setInterval(() => load(true), 10000);
    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [load]);

  useEffect(() => {
    if (!isAdmin) return;
    supabase.from('departments').select('id, code').order('code').then(({ data }) => setDepts(data || []));
  }, [isAdmin]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.items.filter((r) => {
      if (status === 'pending' && !ACTIVE_STATUSES.includes(r.status)) return false;
      if (status !== 'pending' && status !== 'all' && r.status !== status) return false;
      if (isAdmin && dept !== 'all' && r.department?.code !== dept) return false;
      if (q && !(r.tracking_id.toLowerCase().includes(q) || (r.student?.full_name || '').toLowerCase().includes(q))) return false;
      return true;
    });
  }, [state.items, status, dept, query, isAdmin]);

  const pendingCount = state.items.filter((r) => ACTIVE_STATUSES.includes(r.status)).length;

  return (
    <div className="page wide">
      <div className="row between wrap">
        <h1 className="page-title">Requests</h1>
        <span className="muted">{pendingCount} pending</span>
      </div>

      <div className="toolbar">
        <div className="chips" role="group" aria-label="Filter by status">
          {FILTERS.map(([value, label]) => (
            <button key={value} type="button" className={status === value ? 'filter active' : 'filter'} onClick={() => setStatus(value)}>
              {label}
            </button>
          ))}
        </div>
        <div className="row gap wrap">
          {isAdmin ? (
            <select className="select" aria-label="Filter by department" value={dept} onChange={(e) => setDept(e.target.value)}>
              <option value="all">All departments</option>
              {depts.map((d) => (
                <option key={d.id} value={d.code}>{d.code}</option>
              ))}
            </select>
          ) : null}
          <input
            type="search"
            className="search"
            placeholder="Search ID or student"
            aria-label="Search requests"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {state.error ? <ErrorBanner message={state.error} onRetry={() => load(false)} /> : null}

      {state.loading ? (
        <SkeletonList rows={4} />
      ) : visible.length === 0 ? (
        <Empty
          title={status === 'pending' ? 'No pending requests' : 'No requests match'}
          text={status === 'pending' ? 'New requests for your department will appear here.' : 'Try a different filter.'}
        />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Student</th>
                <th>Type</th>
                <th>Dept</th>
                <th>Status</th>
                <th>Waiting</th>
                <th>Assigned to</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr
                  key={r.id}
                  tabIndex={0}
                  onClick={() => router.push(`/staff/requests/${r.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') router.push(`/staff/requests/${r.id}`);
                  }}
                >
                  <td><strong>{r.tracking_id}</strong></td>
                  <td>
                    {r.student?.full_name}
                    <div className="muted small">{r.student?.register_no}</div>
                  </td>
                  <td>{r.request_type?.name}</td>
                  <td>{r.department?.code}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td>{timeAgo(r.created_at)}</td>
                  <td>{r.assignee?.full_name || <span className="muted">Not yet</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
