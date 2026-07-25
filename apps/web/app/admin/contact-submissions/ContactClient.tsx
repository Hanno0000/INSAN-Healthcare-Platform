'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/admin/ui/Toast';
import PageHeader from '@/components/admin/ui/PageHeader';
import DataTable from '@/components/admin/ui/DataTable';
import Pagination from '@/components/admin/ui/Pagination';
import SearchBar from '@/components/admin/ui/SearchBar';
import Modal from '@/components/admin/ui/Modal';
import { Eye, MailOpen } from 'lucide-react';
import { clsx } from 'clsx';

export default function ContactClient() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', page, search],
    queryFn: () => api.contact.list({ page, pageSize: 15, search: search || undefined }),
  });

  const readMut = useMutation({
    mutationFn: (id: string) => api.contact.markRead(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contacts'] }); },
    onError: (e: any) => toast('error', e.message),
  });

  const openDetail = (r: any) => {
    setSelected(r);
    if (!r.isRead) readMut.mutate(r.id);
  };

  const columns = [
    { key: 'name', header: 'الاسم', render: (r: any) => (
      <div className="flex items-center gap-2">
        {!r.isRead && <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />}
        <p className={clsx('font-medium', !r.isRead && 'text-gray-900')}>{r.name}</p>
      </div>
    )},
    { key: 'subject', header: 'الموضوع', render: (r: any) => r.subject || '—' },
    { key: 'email', header: 'البريد', render: (r: any) => <span dir="ltr" className="text-sm">{r.email}</span> },
    { key: 'isRead', header: 'الحالة', render: (r: any) => (
      <span className={clsx('text-xs px-2 py-0.5 rounded-full', r.isRead ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-700 font-medium')}>
        {r.isRead ? 'مقروء' : 'جديد'}
      </span>
    )},
    { key: 'createdAt', header: 'التاريخ', render: (r: any) => new Date(r.createdAt).toLocaleDateString('ar-EG') },
    { key: 'actions', header: '', width: '50px', render: (r: any) => (
      <button onClick={(e) => { e.stopPropagation(); openDetail(r); }} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"><Eye size={14} /></button>
    )},
  ];

  return (
    <div>
      <PageHeader title="رسائل التواصل" subtitle={`${data?.meta.total ?? 0} رسالة`} />
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="mb-4 max-w-xs"><SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="بحث في الرسائل..." /></div>
        <DataTable columns={columns} data={data?.data ?? []} loading={isLoading} onRowClick={openDetail} />
        <Pagination page={page} totalPages={data?.meta.totalPages ?? 1} total={data?.meta.total ?? 0} pageSize={15} onPage={setPage} />
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="تفاصيل الرسالة" size="md">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-xs text-gray-400">الاسم</p><p className="font-medium">{selected.name}</p></div>
              <div><p className="text-xs text-gray-400">البريد</p><p dir="ltr">{selected.email}</p></div>
              {selected.phone && <div><p className="text-xs text-gray-400">الهاتف</p><p dir="ltr">{selected.phone}</p></div>}
              {selected.subject && <div><p className="text-xs text-gray-400">الموضوع</p><p>{selected.subject}</p></div>}
              <div><p className="text-xs text-gray-400">التاريخ</p><p>{new Date(selected.createdAt).toLocaleDateString('ar-EG')}</p></div>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-2">الرسالة</p>
              <div className="bg-gray-50 rounded-xl p-4 text-sm whitespace-pre-wrap">{selected.message}</div>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className={clsx('text-xs px-2.5 py-1 rounded-full', selected.isRead ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-700')}>
                {selected.isRead ? 'مقروء' : 'غير مقروء'}
              </span>
              <button onClick={() => setSelected(null)} className="px-4 py-2 text-sm rounded-xl border border-gray-200 hover:bg-gray-50 transition">إغلاق</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
