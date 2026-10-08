'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Empty, ErrorBanner, Loading, StatusBadge } from '@/components/ui';

function NewRequestForm() {
  const params = useSearchParams();
  const presetType = params.get('type') || '';
  const fromAnnouncement = params.get('from') || null;

  const [types, setTypes] = useState({ loading: true, error: '', items: [] });
  const [typeId, setTypeId] = useState(presetType);
  const [reason, setReason] = useState('');
  const [neededBy, setNeededBy] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);

  async function loadTypes() {
    setTypes({ loading: true, error: '', items: [] });
    const { data, error: err } = await supabase
      .from('request_types')
      .select('id, name, description')
      .order('name');
    if (err) setTypes({ loading: false, error: err.message, items: [] });
    else setTypes({ loading: false, error: '', items: data });
  }

  useEffect(() => {
    loadTypes();
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    if (busy) return;
    setError('');
    if (!typeId) return setError('Choose the type of request.');
    if (reason.trim().length < 5) return setError('Describe your reason in at least 5 characters.');

    setBusy(true);
    const { data, error: err } = await supabase.rpc('create_request', {
      p_type_id: typeId,
      p_reason: reason,
      p_needed_by: neededBy || null,
      p_source_announcement_id: fromAnnouncement,
    });
    setBusy(false);
    if (err) return setError(err.message);
    setCreated(data);
  }

  async function copyId() {
    try {
      await navigator.clipboard.writeText(created.tracking_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable, ignore */
    }
  }

  if (created) {
    return (
      <div className="page narrow">
        <div className="card success-card">
          <h1 className="page-title">Request submitted</h1>
          <p className="muted">Keep this tracking ID. You can follow the status any time under My requests.</p>
          <div className="tracking">
            <span className="tracking-id">{created.tracking_id}</span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={copyId}>
              {copied ? 'Copied' : 'Copy ID'}
            </button>
          </div>
          <p><StatusBadge status={created.status} /></p>
          <div className="row gap wrap">
            <Link href={`/app/requests/${created.id}`} className="btn btn-primary">View request</Link>
            <Link href="/app" className="btn btn-secondary">Back to home</Link>
          </div>
        </div>
      </div>
    );
  }

  if (types.loading) return <Loading />;
  if (types.error) return <div className="page"><ErrorBanner message={types.error} onRetry={loadTypes} /></div>;
  if (types.items.length === 0) {
    return <div className="page"><Empty title="No request types available" text="Please contact the college office." /></div>;
  }

  return (
    <div className="page narrow">
      <Link href="/app/requests" className="back">Back to my requests</Link>
      <h1 className="page-title">New request</h1>

      <form onSubmit={onSubmit} className="form" noValidate>
        <fieldset className="field">
          <legend>What do you need?</legend>
          <div className="radio-cards">
            {types.items.map((t) => (
              <label key={t.id} className={typeId === t.id ? 'radio-card selected' : 'radio-card'}>
                <input
                  type="radio"
                  name="type"
                  value={t.id}
                  checked={typeId === t.id}
                  onChange={() => setTypeId(t.id)}
                />
                <span>
                  <strong>{t.name}</strong>
                  <span className="muted small block">{t.description}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="field">
          <span>Reason</span>
          <textarea
            rows={4}
            maxLength={1000}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="For example: needed for scholarship application"
          />
        </label>

        <label className="field">
          <span>Needed by (optional)</span>
          <input type="date" value={neededBy} onChange={(e) => setNeededBy(e.target.value)} />
        </label>

        {error ? <div className="banner banner-error" role="alert">{error}</div> : null}

        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Submitting…' : 'Submit request'}
        </button>
      </form>
    </div>
  );
}

export default function NewRequestPage() {
  return (
    <Suspense fallback={<Loading />}>
      <NewRequestForm />
    </Suspense>
  );
}
