import { STATUS, categoryLabel, deadlineInfo, formatDateTime, roleLabel } from '@/lib/format';

export function Loading({ label = 'Loading' }) {
  return (
    <div className="loading" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function SkeletonList({ rows = 3 }) {
  return (
    <div className="stack" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="card skeleton" />
      ))}
    </div>
  );
}

export function Empty({ title, text, children }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {text ? <p>{text}</p> : null}
      {children}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }) {
  return (
    <div className="banner banner-error" role="alert">
      <span>{message || 'Something went wrong. Check your connection and try again.'}</span>
      {onRetry ? (
        <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function StatusBadge({ status }) {
  const s = STATUS[status] || { label: status, cls: 'badge-grey' };
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}

export function CategoryBadge({ category }) {
  return <span className="badge badge-cat">{categoryLabel(category)}</span>;
}

export function DeadlineChip({ at }) {
  if (!at) return null;
  const d = deadlineInfo(at);
  return <span className={`chip chip-${d.level}`}>{d.text}</span>;
}

export function PublisherLine({ publisher }) {
  if (!publisher) return null;
  const dept = publisher.department?.code;
  return (
    <span className="muted">
      {publisher.full_name}, {roleLabel(publisher.role)}
      {dept ? ` (${dept})` : ''}
    </span>
  );
}

// Vertical status history. `history` rows come from request_status_history.
export function Timeline({ history }) {
  const rows = [...(history || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  return (
    <ol className="timeline">
      {rows.map((h, i) => {
        const s = STATUS[h.to_status] || { long: h.to_status };
        const last = i === rows.length - 1;
        return (
          <li key={h.id} className={last ? 'timeline-item current' : 'timeline-item'}>
            <span className="timeline-dot" aria-hidden="true" />
            <div className="timeline-body">
              <div className="timeline-title">{s.long}</div>
              <div className="muted small">
                {h.changer?.full_name ? `${h.changer.full_name}, ` : ''}
                {formatDateTime(h.created_at)}
              </div>
              {h.note ? <p className="note">{h.note}</p> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
