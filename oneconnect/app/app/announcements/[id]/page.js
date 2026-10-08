'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { CategoryBadge, DeadlineChip, Empty, ErrorBanner, Loading, PublisherLine } from '@/components/ui';
import { formatDateTime, timeAgo } from '@/lib/format';

const SELECT = `
  id, title, body, category, deadline_at, published_at, target_year,
  publisher:profiles!created_by(full_name, role, department:departments(code, name)),
  audience:departments!target_department_id(code),
  action_type:request_types!action_request_type_id(id, name, description)
`;

export default function AnnouncementDetail() {
  const { id } = useParams();
  const [state, setState] = useState({ loading: true, error: '', notFound: false, a: null });

  async function load() {
    setState({ loading: true, error: '', notFound: false, a: null });
    const { data, error } = await supabase.from('announcements').select(SELECT).eq('id', id).maybeSingle();
    if (error) setState({ loading: false, error: error.message, notFound: false, a: null });
    else if (!data) setState({ loading: false, error: '', notFound: true, a: null });
    else setState({ loading: false, error: '', notFound: false, a: data });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (state.loading) return <Loading />;
  if (state.error) return <div className="page"><ErrorBanner message={state.error} onRetry={load} /></div>;
  if (state.notFound) {
    return (
      <div className="page">
        <Empty title="Announcement not found" text="It may have been removed, or it is not meant for your department or year.">
          <Link href="/app" className="btn btn-secondary">Back to announcements</Link>
        </Empty>
      </div>
    );
  }

  const a = state.a;
  const audience = `${a.audience ? a.audience.code : 'All departments'}, ${a.target_year ? `Year ${a.target_year}` : 'all years'}`;

  return (
    <div className="page narrow">
      <Link href="/app" className="back">Back to announcements</Link>

      <article className="card">
        <div className="row between wrap">
          <CategoryBadge category={a.category} />
          <DeadlineChip at={a.deadline_at} />
        </div>
        <h1 className="page-title">{a.title}</h1>
        <p className="body-text">{a.body}</p>

        {a.deadline_at ? (
          <p className="fact"><strong>Deadline:</strong> {formatDateTime(a.deadline_at)}</p>
        ) : null}
        <p className="fact"><strong>Meant for:</strong> {audience}</p>

        <div className="publisher">
          <div className="small muted">Published by</div>
          <PublisherLine publisher={a.publisher} />
          <span className="muted small"> {timeAgo(a.published_at)}</span>
        </div>

        {a.action_type ? (
          <div className="action-box">
            <div>
              <strong>{a.action_type.name}</strong>
              <p className="muted small">{a.action_type.description}</p>
            </div>
            <Link
              href={`/app/requests/new?type=${a.action_type.id}&from=${a.id}`}
              className="btn btn-primary"
            >
              Request {a.action_type.name}
            </Link>
          </div>
        ) : null}
      </article>
    </div>
  );
}
