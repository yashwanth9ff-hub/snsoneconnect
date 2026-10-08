'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useRequest } from '@/lib/useRequest';
import { Empty, ErrorBanner, Loading, StatusBadge, Timeline } from '@/components/ui';
import { formatDate, formatDateTime } from '@/lib/format';

export default function StaffRequestDetail() {
  const { id } = useParams();
  const { loading, error, notFound, data: r, reload } = useRequest(id);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [done, setDone] = useState('');

  async function change(newStatus, message) {
    if (busy) return;
    setActionError('');
    setDone('');
    setBusy(true);
    const { error: err } = await supabase.rpc('transition_request', {
      p_request_id: id,
      p_new_status: newStatus,
      p_note: note,
    });
    setBusy(false);
    if (err) return setActionError(err.message);
    setNote('');
    setDone(message);
    reload();
  }

  if (loading) return <Loading />;
  if (error) return <div className="page"><ErrorBanner message={error} onRetry={reload} /></div>;
  if (notFound) {
    return (
      <div className="page">
        <Empty title="Request not found" text="It may belong to another department.">
          <Link href="/staff/requests" className="btn btn-secondary">Back to requests</Link>
        </Empty>
      </div>
    );
  }

  const closed = r.status === 'completed' || r.status === 'rejected';

  return (
    <div className="page wide">
      <Link href="/staff/requests" className="back">Back to requests</Link>

      <div className="split">
        <div>
          <div className="card">
            <div className="row between wrap">
              <strong className="tracking-id">{r.tracking_id}</strong>
              <StatusBadge status={r.status} />
            </div>
            <h1 className="page-title">{r.request_type?.name}</h1>
            <dl className="facts">
              <div>
                <dt>Student</dt>
                <dd>
                  {r.student?.full_name}
                  <span className="muted small block">
                    {r.student?.register_no}, {r.student?.department?.code}, Year {r.student?.year}
                  </span>
                </dd>
              </div>
              <div><dt>Reason</dt><dd>{r.reason}</dd></div>
              {r.needed_by ? <div><dt>Needed by</dt><dd>{formatDate(r.needed_by)}</dd></div> : null}
              <div><dt>Submitted</dt><dd>{formatDateTime(r.created_at)}</dd></div>
              <div><dt>Department</dt><dd>{r.department?.name}</dd></div>
              <div><dt>Assigned to</dt><dd>{r.assignee?.full_name || 'Not yet'}</dd></div>
            </dl>
          </div>

          <h2 className="group-title">History</h2>
          <div className="card">
            <Timeline history={r.history} />
          </div>
        </div>

        <aside className="card action-panel" aria-label="Update status">
          <h2 className="group-title">Update status</h2>
          {closed ? (
            <p className="muted">This request is closed. No further changes are possible.</p>
          ) : (
            <>
              <label className="field">
                <span>Note to student {r.status === 'under_review' ? '(optional)' : '(required to reject)'}</span>
                <textarea
                  rows={4}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={
                    r.status === 'under_review'
                      ? 'For example: Collect from the Office, Block A, 10 AM to 4 PM'
                      : 'Add a note for the student'
                  }
                />
              </label>

              {actionError ? <div className="banner banner-error" role="alert">{actionError}</div> : null}
              {done ? <div className="banner banner-success" role="status">{done}</div> : null}

              <div className="stack-sm">
                {r.status === 'submitted' ? (
                  <button type="button" className="btn btn-primary" disabled={busy} onClick={() => change('under_review', 'Marked as under review. The student has been notified.')}>
                    Start review
                  </button>
                ) : null}
                {r.status === 'under_review' ? (
                  <button type="button" className="btn btn-primary" disabled={busy} onClick={() => change('completed', 'Marked as ready. The student has been notified.')}>
                    Mark ready for collection
                  </button>
                ) : null}
                <button type="button" className="btn btn-danger" disabled={busy} onClick={() => change('rejected', 'Request rejected. The student has been notified.')}>
                  Reject
                </button>
              </div>
            </>
          )}
          {closed && done ? <div className="banner banner-success" role="status">{done}</div> : null}
        </aside>
      </div>
    </div>
  );
}
