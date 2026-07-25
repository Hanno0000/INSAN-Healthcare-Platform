import Link from 'next/link';

interface Props {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}

export default function Pagination({ page, totalPages, buildHref }: Props) {
  if (totalPages <= 1) return null;

  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <nav className="flex items-center justify-center gap-1 mt-10">
      {page > 1 && (
        <Link href={buildHref(page - 1)} className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
          السابق
        </Link>
      )}
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`dots-${i}`} className="px-3 py-2 text-gray-400 text-sm">…</span>
        ) : (
          <Link
            key={p}
            href={buildHref(p as number)}
            className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
              p === page ? 'bg-secondary-500 text-white' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {p}
          </Link>
        )
      )}
      {page < totalPages && (
        <Link href={buildHref(page + 1)} className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
          التالي
        </Link>
      )}
    </nav>
  );
}
