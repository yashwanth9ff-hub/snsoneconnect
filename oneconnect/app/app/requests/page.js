'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Empty, ErrorBanner, SkeletonList, StatusBadge } from '@/components/ui';
import { ACTIVE_STATUSES, timeAgo } from '@/lib/format';

export default function MyRequests() {
  const [state, setState] = useState({ loading: true, error: '', items: [] });
  const [tab, setTab] = useState('active');

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    const { data, error } = await supabase
      .from('requests')
      .select('id, tracking_id, status, updated_at, created_at, request_type:request_types(name)')
      .order('created_at', { ascending: false });
    if (error) setState({ loading: false, error: error.message, items: [] });
    else setState({ loading: false, error: '', items: data });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(
    () =>
      state.items.filter((r) =>
        tab === 'active' ? ACTIVE_STATUSES.includes(r.status) : !ACTIVE_STATUSES.includes(r.status)
      ),
    [state.items, tab]
  );

  return (
    <div className="page">
      <div className="row between wrap">
        <h1 className="page-title">My requests</h1>
        <Link href="/app/requests/new" className="btn btn-primary">New request</Link>
      </div>

      <div className="chips" role="group" aria-label="Filter requests">
        <button type="button" className={tab === 'active' ? 'filter active' : 'filter'} onClick={() => setTab('active')}>
          Active
        </button>
        <button type="button" className={tab === 'closed' ? 'filter active' : 'filter'} onClick={() => setTab('closed')}>
          Closed
        </button>
      </div>

      {state.error ? <ErrorBanner message={state.error} onRetry={load} /> : null}

      {state.loading ? (
        <SkeletonList rows={3} />
      ) : visible.length === 0 ? (
        state.items.length === 0 ? (
          <Empty title="No requests yet" text="Need a certificate or permission? Start a request and track it here.">
            <Link href="/app/requests/new" className="btn btn-primary">New request</Link>
          </Empty>
        ) : (
          <Empty title={tab === 'active' ? 'No active requests' : 'No closed requests'} />
        )
      ) : (
        <div className="stack">
          {visible.map((r) => (
            <Link key={r.id} href={`/app/requests/${r.id}`} className="card card-link">
              <div className="row between wrap">
                <strong>{r.tracking_id}</strong>
                <StatusBadge status={r.status} />
              </div>
              <h3 className="card-title">{r.request_type?.name}</h3>
              <p className="muted small">Updated {timeAgo(r.updated_at)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
