'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { DeadlineChip, Empty, ErrorBanner, SkeletonList } from '@/components/ui';
import { formatDateTime } from '@/lib/format';

function group(items) {
  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  const endToday = startToday.getTime() + 86400000;
  const endWeek = startToday.getTime() + 7 * 86400000;
  const out = { today: [], week: [], later: [] };
  for (const it of items) {
    const t = new Date(it.at).getTime();
    if (t < endToday) out.today.push(it);
    else if (t < endWeek) out.week.push(it);
    else out.later.push(it);
  }
  return out;
}

function Row({ it }) {
  const inner = (
    <>
      <div className="row between wrap">
        <span className="badge badge-cat">{it.kind === 'deadline' ? 'Deadline' : 'Event'}</span>
        {it.kind === 'deadline' ? <DeadlineChip at={it.at} /> : null}
      </div>
      <h3 className="card-title">{it.title}</h3>
      <p className="muted small">
        {formatDateTime(it.at)}
        {it.detail ? `, ${it.detail}` : ''}
      </p>
    </>
  );
  return it.link ? (
    <Link href={it.link} className="card card-link">{inner}</Link>
  ) : (
    <div className="card">{inner}</div>
  );
}

export default function UpcomingPage() {
  const [state, setState] = useState({ loading: true, error: '', items: [] });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    const { data, error } = await supabase
      .from('upcoming_items')
      .select('kind, id, title, detail, at, link')
      .gte('at', new Date().toISOString())
      .order('at', { ascending: true });
    if (error) setState({ loading: false, error: error.message, items: [] });
    else setState({ loading: false, error: '', items: data });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const groups = useMemo(() => group(state.items), [state.items]);
  const sections = [
    ['Today', groups.today],
    ['This week', groups.week],
    ['Later', groups.later],
  ];

  return (
    <div className="page">
      <h1 className="page-title">Upcoming</h1>
      {state.error ? <ErrorBanner message={state.error} onRetry={load} /> : null}
      {state.loading ? (
        <SkeletonList rows={3} />
      ) : state.items.length === 0 ? (
        <Empty title="No upcoming items" text="Deadlines and events for you will show up here." />
      ) : (
        sections.map(([title, list]) =>
          list.length ? (
            <section key={title} className="group">
              <h2 className="group-title">{title}</h2>
              <div className="stack">
                {list.map((it) => (
                  <Row key={`${it.kind}-${it.id}`} it={it} />
                ))}
              </div>
            </section>
          ) : null
        )
      )}
    </div>
  );
}
