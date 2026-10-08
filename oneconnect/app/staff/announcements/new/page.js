'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { ErrorBanner, Loading } from '@/components/ui';
import { CATEGORIES, localToIso } from '@/lib/format';

export default function NewAnnouncement() {
  const { profile } = useAuth();
  const isAdmin = profile.role === 'admin';

  const [lists, setLists] = useState({ loading: true, error: '', depts: [], types: [] });
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('general');
  const [deptId, setDeptId] = useState(isAdmin ? '' : profile.department_id);
  const [year, setYear] = useState('');
  const [deadline, setDeadline] = useState('');
  const [actionType, setActionType] = useState('');
  const [reach, setReach] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [published, setPublished] = useState(null);

  async function loadLists() {
    setLists((l) => ({ ...l, loading: true, error: '' }));
    const [d, t] = await Promise.all([
      supabase.from('departments').select('id, code, name').order('code'),
      supabase.from('request_types').select('id, name').order('name'),
    ]);
    const err = d.error || t.error;
    if (err) setLists({ loading: false, error: err.message, depts: [], types: [] });
    else setLists({ loading: false, error: '', depts: d.data, types: t.data });
  }

  useEffect(() => {
    loadLists();
  }, []);

  // Live "visible to N students" counter
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      const { data, error: err } = await supabase.rpc('count_reach', {
        p_dept: deptId || null,
        p_year: year ? Number(year) : null,
      });
      if (!cancelled) setReach(err ? null : data);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [deptId, year]);

  async function onSubmit(e) {
    e.preventDefault();
    if (busy) return;
    setError('');
    if (title.trim().length < 3) return setError('Enter a title of at least 3 characters.');
    if (body.trim().length < 3) return setError('Enter the announcement text.');

    setBusy(true);
    const { data, error: err } = await supabase.rpc('publish_announcement', {
      p_title: title,
      p_body: body,
      p_category: category,
      p_target_department_id: deptId || null,
      p_target_year: year ? Number(year) : null,
      p_deadline_at: localToIso(deadline),
      p_action_request_type_id: actionType || null,
    });
    setBusy(false);
    if (err) return setError(err.message);
    setPublished({ title: data.title, reach });
  }

  function reset() {
    setPublished(null);
    setTitle('');
    setBody('');
    setDeadline('');
    setActionType('');
    setCategory('general');
    setYear('');
    if (isAdmin) setDeptId('');
  }

  if (lists.loading) return <Loading />;
  if (lists.error) return <div className="page"><ErrorBanner message={lists.error} onRetry={loadLists} /></div>;

  if (published) {
    return (
      <div className="page narrow">
        <div className="card success-card">
          <h1 className="page-title">Announcement published</h1>
          <p>
            <strong>{published.title}</strong>
          </p>
          <p className="muted">
            {published.reach === null
              ? 'Matching students have been notified.'
              : `${published.reach} student${published.reach === 1 ? ' was' : 's were'} notified.`}
          </p>
          <div className="row gap wrap">
            <button type="button" className="btn btn-primary" onClick={reset}>Post another</button>
            <Link href="/staff/requests" className="btn btn-secondary">View requests</Link>
          </div>
        </div>
      </div>
    );
  }

  const ownDept = lists.depts.find((d) => d.id === profile.department_id);

  return (
    <div className="page narrow">
      <h1 className="page-title">New announcement</h1>

      <form onSubmit={onSubmit} className="form" noValidate>
        <label className="field">
          <span>Title</span>
          <input type="text" maxLength={150} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>

        <label className="field">
          <span>Announcement text</span>
          <textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} />
        </label>

        <div className="grid-2">
          <label className="field">
            <span>Category</span>
            <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Deadline (optional)</span>
            <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </label>
        </div>

        <div className="grid-2">
          <label className="field">
            <span>Department</span>
            {isAdmin ? (
              <select className="select" value={deptId} onChange={(e) => setDeptId(e.target.value)}>
                <option value="">All departments</option>
                {lists.depts.map((d) => (
                  <option key={d.id} value={d.id}>{d.code}</option>
                ))}
              </select>
            ) : (
              <input type="text" value={ownDept ? `${ownDept.code} (your department)` : ''} disabled />
            )}
          </label>

          <label className="field">
            <span>Year</span>
            <select className="select" value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="">All years</option>
              {[1, 2, 3, 4].map((y) => (
                <option key={y} value={y}>Year {y}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="field">
          <span>Action button (optional)</span>
          <select className="select" value={actionType} onChange={(e) => setActionType(e.target.value)}>
            <option value="">No action button</option>
            {lists.types.map((t) => (
              <option key={t.id} value={t.id}>Request {t.name}</option>
            ))}
          </select>
          <span className="hint">Students see a button that opens this request with the form already started.</span>
        </label>

        <p className="reach" aria-live="polite">
          {reach === null ? 'Counting students…' : `Visible to ${reach} student${reach === 1 ? '' : 's'}`}
        </p>

        {error ? <div className="banner banner-error" role="alert">{error}</div> : null}

        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Publishing…' : 'Publish'}
        </button>
      </form>
    </div>
  );
}
