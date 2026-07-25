import { clsx } from 'clsx';

interface Column<T> {
  key: string;
  header: string;
  width?: string;
  render?: (row: T) => React.ReactNode;
}

interface Props<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  rowKey?: (row: T) => string;
  emptyText?: string;
  onRowClick?: (row: T) => void;
}

export default function DataTable<T extends { id?: string }>({
  columns, data, loading, rowKey, emptyText = 'لا توجد بيانات', onRowClick,
}: Props<T>) {
  if (loading) {
    return (
      <div className="space-y-3 py-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            {columns.map((col) => (
              <th
                key={col.key}
                className="text-right px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide whitespace-nowrap"
                style={col.width ? { width: col.width } : undefined}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-12 text-gray-400">
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={rowKey ? rowKey(row) : (row.id ?? i)}
                onClick={() => onRowClick?.(row)}
                className={clsx(
                  'bg-white hover:bg-gray-50/60 transition-colors',
                  onRowClick && 'cursor-pointer',
                )}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-gray-800 whitespace-nowrap">
                    {col.render ? col.render(row) : (row as any)[col.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
