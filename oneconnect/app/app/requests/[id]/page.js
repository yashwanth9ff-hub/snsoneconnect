'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useRequest } from '@/lib/useRequest';
import {
  Empty,
  ErrorBanner,
  Loading,
  StatusBadge,
  Timeline,
} from '@/components/ui';
import { formatDate, formatDateTime } from '@/lib/format';

const journey = [
  { key: 'submitted', label: 'Submitted' },
  { key: 'under_review', label: 'Under review' },
  { key: 'completed', label: 'Ready for collection' },
];

export default function StudentRequestDetail() {
  const { id } = useParams();
  const { loading, error, notFound, data: r, reload } = useRequest(id);

  if (loading) return <Loading />;

  if (error) {
    return (
      <div className="page">
        <ErrorBanner message={error} onRetry={reload} />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="page">
        <Empty
          title="Request not found"
          text="Check the link, or look for it under My requests."
        >
          <Link href="/app/requests" className="btn btn-secondary">
            My requests
          </Link>
        </Empty>
      </div>
    );
  }

  const ready =
    r.status === 'completed'
      ? [...r.history]
          .reverse()
          .find((h) => h.to_status === 'completed')
      : null;

  const currentIndex = journey.findIndex(
    (step) => step.key === r.status
  );

  const activeIndex =
    currentIndex === -1
      ? r.status === 'rejected'
        ? 0
        : 0
      : currentIndex;

  return (
    <div className="page narrow">
      <Link href="/app/requests" className="back">
        Back to my requests
      </Link>

      <div className="card request-hero">
        <div className="row between wrap">
          <strong className="tracking-id">
            {r.tracking_id}
          </strong>

          <StatusBadge status={r.status} />
        </div>

        <h1 className="page-title">
          {r.request_type?.name}
        </h1>

        <p className="request-hero-subtitle">
          Track your request from submission to resolution.
        </p>

        {ready ? (
          <div className="banner banner-success" role="status">
            <div>
              <strong>Ready for collection</strong>
              {ready.note ? <p>{ready.note}</p> : null}
            </div>
          </div>
        ) : null}
      </div>

      <section className="journey-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">LIVE REQUEST JOURNEY</span>
            <h2>Where your request stands</h2>
          </div>
        </div>

        <div className="journey-card">
          <div className="journey-track">
            {journey.map((step, index) => {
              const completed = index <= activeIndex;
              const current = index === activeIndex;

              return (
                <div
                  key={step.key}
                  className={
                    completed
                      ? 'journey-step completed'
                      : 'journey-step'
                  }
                >
                  <div className="journey-node">
                    {completed ? '✓' : index + 1}
                  </div>

                  <div className="journey-label">
                    <strong>{step.label}</strong>

                    {current ? (
                      <span>Current stage</span>
                    ) : completed ? (
                      <span>Completed</span>
                    ) : (
                      <span>Upcoming</span>
                    )}
                  </div>

                  {index < journey.length - 1 ? (
                    <div
                      className={
                        index < activeIndex
                          ? 'journey-line active'
                          : 'journey-line'
                      }
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="card">
        <dl className="facts">
          <div>
            <dt>Handled by</dt>
            <dd>{r.department?.name}</dd>
          </div>

          <div>
            <dt>Submitted</dt>
            <dd>{formatDateTime(r.created_at)}</dd>
          </div>

          {r.needed_by ? (
            <div>
              <dt>Needed by</dt>
              <dd>{formatDate(r.needed_by)}</dd>
            </div>
          ) : null}

          <div>
            <dt>Your reason</dt>
            <dd>{r.reason}</dd>
          </div>
        </dl>
      </div>

      <h2 className="group-title">Request history</h2>

      <div className="card">
        <Timeline history={r.history} />
      </div>
    </div>
  );
}