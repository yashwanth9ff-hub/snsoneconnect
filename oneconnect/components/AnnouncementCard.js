import Link from 'next/link';
import { CategoryBadge, DeadlineChip, PublisherLine } from '@/components/ui';
import { timeAgo } from '@/lib/format';

export default function AnnouncementCard({ a }) {
  return (
    <Link href={`/app/announcements/${a.id}`} className="card card-link">
      <div className="row between wrap">
        <CategoryBadge category={a.category} />
        <DeadlineChip at={a.deadline_at} />
      </div>
      <h3 className="card-title">{a.title}</h3>
      <p className="clamp">{a.body}</p>
      <div className="row between wrap small">
        <PublisherLine publisher={a.publisher} />
        <span className="muted">{timeAgo(a.published_at)}</span>
      </div>
    </Link>
  );
}
