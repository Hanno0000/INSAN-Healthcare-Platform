'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import PageHeader from '@/components/admin/ui/PageHeader';
import DataTable from '@/components/admin/ui/DataTable';
import Pagination from '@/components/admin/ui/Pagination';
import SearchBar from '@/components/admin/ui/SearchBar';
import Modal from '@/components/admin/ui/Modal';
import { clsx } from 'clsx';

const ACTION_COLOR: Record<string, string> = {
  create: 'bg-emerald-100 text-emerald-700',
  update: 'bg-blue-100 text-blue-700',
  delete: 'bg-red-100 text-red-600',
  publish: 'bg-purple-100 text-purple-700',
  unpublish: 'bg-yellow-100 text-yellow-700',
  login: 'bg-gray-100 text-gray-600',
};

export default function AuditLogClient() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, search],
    queryFn: () => api.audit.list({ page, pageSize: 20 }),
  });

  const columns = [
    { key: 'action', header: 'الإجراء', render: (r: any) => (
      <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', ACTION_COLOR[r.action] ?? 'bg-gray-100 text-gray-600')}>
        {r.action}
      </span>
    )},
    { key: 'entity', header: 'الكيان', render: (r: any) => (
      <div><p className="font-medium text-sm">{r.entity}</p><p className="text-xs text-gray-400 font-mono">{r.entityId?.slice(0, 8)}...</p></div>
    )},
    { key: 'user', header: 'المستخدم', render: (r: any) => r.user?.name || '—' },
    { key: 'ipAddress', header: 'IP', render: (r: any) => <span dir="ltr" className="text-xs text-gray-400">{r.ipAddress || '—'}</span> },
    { key: 'createdAt', header: 'الوقت', render: (r: any) => (
      <span className="text-xs text-gray-500">{new Date(r.createdAt).toLocaleString('ar-EG')}</span>
    )},
  ];

  return (
    <div>
      <PageHeader title="سجل التدقيق" subtitle="جميع العمليات المسجلة في النظام" />
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <DataTable columns={columns} data={data?.data ?? []} loading={isLoading} onRowClick={(r) => setSelected(r)} />
        <Pagination page={page} totalPages={data?.meta.totalPages ?? 1} total={data?.meta.total ?? 0} pageSize={20} onPage={setPage} />
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="تفاصيل السجل" size="md">
        {selected && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-gray-400">الإجراء</p><p className="font-mono font-medium">{selected.action}</p></div>
              <div><p className="text-xs text-gray-400">الكيان</p><p className="font-medium">{selected.entity}</p></div>
              <div><p className="text-xs text-gray-400">معرف الكيان</p><p className="font-mono text-xs break-all">{selected.entityId}</p></div>
              <div><p className="text-xs text-gray-400">المستخدم</p><p>{selected.user?.name || '—'}</p></div>
              <div><p className="text-xs text-gray-400">IP</p><p dir="ltr">{selected.ipAddress || '—'}</p></div>
              <div><p className="text-xs text-gray-400">الوقت</p><p>{new Date(selected.createdAt).toLocaleString('ar-EG')}</p></div>
            </div>
            {selected.changes && (
              <div>
                <p className="text-xs text-gray-400 mb-1">التغييرات</p>
                <pre className="text-xs bg-gray-50 rounded-xl p-3 overflow-auto max-h-48">
                  {JSON.stringify(selected.changes, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
