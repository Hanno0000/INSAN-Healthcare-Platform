import { clsx } from 'clsx';

type Status = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'NEW' | 'CONTACTED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | string;

const MAP: Record<string, { label: string; cls: string }> = {
  DRAFT:     { label: 'مسودة',     cls: 'bg-gray-100 text-gray-600' },
  PUBLISHED: { label: 'منشور',     cls: 'bg-emerald-100 text-emerald-700' },
  ARCHIVED:  { label: 'مؤرشف',     cls: 'bg-red-100 text-red-600' },
  NEW:       { label: 'جديد',      cls: 'bg-blue-100 text-blue-700' },
  CONTACTED: { label: 'تم التواصل', cls: 'bg-yellow-100 text-yellow-700' },
  CONFIRMED: { label: 'مؤكد',      cls: 'bg-emerald-100 text-emerald-700' },
  CANCELLED: { label: 'ملغي',      cls: 'bg-red-100 text-red-600' },
  COMPLETED: { label: 'مكتمل',     cls: 'bg-purple-100 text-purple-700' },
  ATTENDED:  { label: 'حضر',       cls: 'bg-teal-100 text-teal-700' },
  NO_SHOW:   { label: 'لم يحضر',   cls: 'bg-orange-100 text-orange-700' },
};

export default function StatusBadge({ status }: { status: Status }) {
  const cfg = MAP[status] ?? { label: status, cls: 'bg-gray-100 text-gray-500' };
  return (
    <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', cfg.cls)}>
      {cfg.label}
    </span>
  );
}
