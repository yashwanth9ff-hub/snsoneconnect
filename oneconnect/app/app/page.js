'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import AnnouncementCard from '@/components/AnnouncementCard';
import {
  DeadlineChip,
  Empty,
  ErrorBanner,
  SkeletonList,
  StatusBadge,
} from '@/components/ui';
import { ACTIVE_STATUSES, CATEGORIES, timeAgo } from '@/lib/format';

const SELECT = `
  id, title, body, category, deadline_at, published_at,
  publisher:profiles!created_by(full_name, role, department:departments(code))
`;

const formatDeadline = (date) =>
  new Date(date).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  });

export default function StudentHome() {
  const [state, setState] = useState({
    loading: true,
    error: '',
    items: [],
    requests: [],
  });

  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));

    const [announcementResult, requestResult] = await Promise.all([
      supabase
        .from('announcements')
        .select(SELECT)
        .order('published_at', { ascending: false })
        .limit(100),

      supabase
        .from('requests')
        .select(
          'id, tracking_id, status, updated_at, created_at, request_type:request_types(name)'
        )
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    if (announcementResult.error) {
      setState({
        loading: false,
        error: announcementResult.error.message,
        items: [],
        requests: [],
      });
      return;
    }

    setState({
      loading: false,
      error: requestResult.error ? requestResult.error.message : '',
      items: announcementResult.data || [],
      requests: requestResult.data || [],
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const needsAction = useMemo(() => {
    const now = Date.now();
    const week = now + 7 * 86400000;

    return state.items
      .filter((a) => {
        if (!a.deadline_at) return false;

        const deadline = new Date(a.deadline_at).getTime();

        return deadline >= now && deadline <= week;
      })
      .sort(
        (a, b) =>
          new Date(a.deadline_at).getTime() -
          new Date(b.deadline_at).getTime()
      );
  }, [state.items]);

  const nextDeadline = needsAction[0];

  const activeRequests = useMemo(
    () =>
      state.requests.filter((r) =>
        ACTIVE_STATUSES.includes(r.status)
      ),
    [state.requests]
  );

  const closedRequests = useMemo(
    () =>
      state.requests.filter(
        (r) => !ACTIVE_STATUSES.includes(r.status)
      ),
    [state.requests]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();

    return state.items.filter(
      (a) =>
        (category === 'all' || a.category === category) &&
        (!q ||
          a.title.toLowerCase().includes(q) ||
          a.body.toLowerCase().includes(q))
    );
  }, [state.items, category, query]);

  const filtering = category !== 'all' || query.trim() !== '';

  return (
    <div className="page">
      <div className="dashboard-hero">
        <div>
          <span className="eyebrow">SNS ONECONNECT</span>

          <h1 className="page-title">
            Campus Command Center
          </h1>

          <p className="dashboard-next">
            Your next move:{' '}
            {nextDeadline
              ? `handle "${nextDeadline.title}" before ${formatDeadline(
                  nextDeadline.deadline_at
                )}.`
              : 'you are all caught up.'}
          </p>

          <p className="dashboard-subtitle">
            Know what matters. Take action. Track what happens next.
          </p>
        </div>

        <Link
          href="/app/requests/new"
          className="btn btn-primary dashboard-cta"
        >
          Start a request
        </Link>
      </div>

      {state.error ? (
        <ErrorBanner message={state.error} onRetry={load} />
      ) : null}

      {!state.loading ? (
        <>
          <section
            className="command-grid"
            aria-label="Campus overview"
          >
            <div className="command-card command-card-action">
              <span className="command-label">
                ACTION REQUIRED
              </span>

              <strong className="command-number">
                {needsAction.length}
              </strong>

              <span className="command-text">
                {needsAction.length === 1
                  ? 'deadline needs your attention'
                  : 'deadlines need your attention'}
              </span>
            </div>

            <div className="command-card">
              <span className="command-label">
                NEXT DEADLINE
              </span>

              <strong className="command-main">
                {nextDeadline
                  ? nextDeadline.title
                  : 'Nothing urgent'}
              </strong>

              <span className="command-text">
                {nextDeadline
                  ? formatDeadline(nextDeadline.deadline_at)
                  : 'You are all caught up'}
              </span>
            </div>

            <div className="command-card">
              <span className="command-label">
                MY REQUESTS
              </span>

              <strong className="command-number">
                {activeRequests.length}
              </strong>

              <span className="command-text">
                {activeRequests.length === 1
                  ? 'request currently active'
                  : 'requests currently active'}
              </span>
            </div>

            <div className="command-card">
              <span className="command-label">
                CLOSED REQUESTS
              </span>

              <strong className="command-number">
                {closedRequests.length}
              </strong>

              <span className="command-text">
                completed or closed requests
              </span>
            </div>
          </section>

          {needsAction.length > 0 ? (
            <section className="priority-panel">
              <div className="priority-header">
                <div>
                  <span className="eyebrow">
                    PRIORITY ACTIONS
                  </span>

                  <h2>
                    Don't let important updates become missed
                    actions.
                  </h2>
                </div>

                <span className="priority-count">
                  {needsAction.length} upcoming
                </span>
              </div>

              <div className="priority-list">
                {needsAction.slice(0, 3).map((a, index) => (
                  <Link
                    key={a.id}
                    href={`/app/announcements/${a.id}`}
                    className="priority-item"
                  >
                    <span className="priority-index">
                      {String(index + 1).padStart(2, '0')}
                    </span>

                    <span className="priority-content">
                      <strong>{a.title}</strong>

                      <span>
                        {a.category} ·{' '}
                        {timeAgo(a.published_at)}
                      </span>
                    </span>

                    <DeadlineChip at={a.deadline_at} />
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {activeRequests.length > 0 ? (
            <section className="request-focus">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">
                    REQUEST TRACKING
                  </span>

                  <h2>Requests in motion</h2>
                </div>

                <Link
                  href="/app/requests"
                  className="text-link"
                >
                  View all →
                </Link>
              </div>

              <div className="request-focus-grid">
                {activeRequests.slice(0, 2).map((request) => (
                  <Link
                    key={request.id}
                    href={`/app/requests/${request.id}`}
                    className="request-focus-card"
                  >
                    <div className="row between wrap">
                      <strong>
                        {request.tracking_id}
                      </strong>

                      <StatusBadge status={request.status} />
                    </div>

                    <h3>
                      {request.request_type?.name}
                    </h3>

                    <p className="muted small">
                      Updated {timeAgo(request.updated_at)}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      <div className="section-heading announcements-heading">
        <div>
          <span className="eyebrow">CAMPUS FEED</span>

          <h2>Announcements</h2>
        </div>
      </div>

      <div className="toolbar">
        <div
          className="chips"
          role="group"
          aria-label="Filter by category"
        >
          <button
            type="button"
            className={
              category === 'all'
                ? 'filter active'
                : 'filter'
            }
            onClick={() => setCategory('all')}
          >
            All
          </button>

          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              className={
                category === c.value
                  ? 'filter active'
                  : 'filter'
              }
              onClick={() => setCategory(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>

        <input
          type="search"
          className="search"
          placeholder="Search announcements"
          aria-label="Search announcements"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {state.loading ? (
        <SkeletonList rows={4} />
      ) : visible.length === 0 ? (
        filtering ? (
          <Empty
            title="No announcements match"
            text="Try a different category or search term."
          />
        ) : (
          <Empty
            title="Nothing for you right now"
            text="New announcements for your department and year will appear here."
          />
        )
      ) : (
        <div className="stack">
          {visible.map((a) => (
            <AnnouncementCard
              key={a.id}
              a={a}
            />
          ))}
        </div>
      )}
    </div>
  );
}