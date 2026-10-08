export const CATEGORIES = [
  { value: 'academic', label: 'Academic' },
  { value: 'exams', label: 'Exams' },
  { value: 'placement', label: 'Placement' },
  { value: 'events', label: 'Events' },
  { value: 'admin', label: 'Admin' },
  { value: 'general', label: 'General' },
];

export function categoryLabel(value) {
  const found = CATEGORIES.find((c) => c.value === value);
  return found ? found.label : value;
}

export const STATUS = {
  submitted: { label: 'Submitted', long: 'Submitted', cls: 'badge-grey' },
  under_review: { label: 'Under review', long: 'Under review', cls: 'badge-blue' },
  completed: { label: 'Ready', long: 'Ready for collection', cls: 'badge-green' },
  rejected: { label: 'Rejected', long: 'Rejected', cls: 'badge-red' },
};

export const ACTIVE_STATUSES = ['submitted', 'under_review'];

export function roleLabel(role) {
  return { student: 'Student', faculty: 'Faculty', admin: 'Admin' }[role] || role;
}

export function formatDateTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function timeAgo(value) {
  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} d ago`;
  return formatDate(value);
}

// Deadline chip: red under 48 hours, amber under 7 days, neutral otherwise
export function deadlineInfo(value) {
  const diff = new Date(value).getTime() - Date.now();
  if (diff < 0) return { text: 'Deadline passed', level: 'past' };
  const hours = diff / 3600000;
  if (hours < 24) return { text: `Due in ${Math.max(1, Math.floor(hours))} h`, level: 'red' };
  const days = Math.ceil(hours / 24);
  return {
    text: `Due in ${days} day${days > 1 ? 's' : ''}`,
    level: hours < 48 ? 'red' : days <= 7 ? 'amber' : 'neutral',
  };
}

// <input type="datetime-local"> value to an ISO string (or null)
export function localToIso(value) {
  return value ? new Date(value).toISOString() : null;
}
