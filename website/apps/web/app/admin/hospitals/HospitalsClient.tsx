'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/admin/ui/Toast';
import PageHeader from '@/components/admin/ui/PageHeader';
import DataTable from '@/components/admin/ui/DataTable';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import Pagination from '@/components/admin/ui/Pagination';
import SearchBar from '@/components/admin/ui/SearchBar';
import ConfirmDialog from '@/components/admin/ui/ConfirmDialog';
import HospitalModal from './HospitalModal';
import { Edit2, Trash2, Globe } from 'lucide-react';

export default function HospitalsClient() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['hospitals', page, search],
    queryFn: () => api.hospitals.list({ page, pageSize: 15, search: search || undefined }),
  });

  const publishMut = useMutation({
    mutationFn: ({ id, published }: any) => published ? api.hospitals.unpublish(id) : api.hospitals.publish(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hospitals'] }); toast('success', 'تم تحديث حالة النشر'); },
    onError: (e: any) => toast('error', e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.hospitals.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hospitals'] }); setDeleteTarget(null); toast('success', 'تم حذف المستشفى'); },
    onError: (e: any) => toast('error', e.message),
  });

  const columns = [
    { key: 'name', header: 'الاسم', render: (r: any) => (
      <div>
        <p className="font-medium text-gray-900">{r.name?.ar || '—'}</p>
        <p className="text-xs text-gray-400">{r.name?.en}</p>
      </div>
    )},
    { key: 'slug', header: 'المعرّف (slug)', render: (r: any) => <span className="text-xs text-gray-500 font-mono" dir="ltr">{r.slug}</span> },
    { key: 'status', header: 'الحالة', render: (r: any) => <StatusBadge status={r.status} /> },
    { key: 'actions', header: '', width: '120px', render: (r: any) => (
      <div className="flex items-center gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); setEditing(r); setModalOpen(true); }}
          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"
        ><Edit2 size={14} /></button>
        <button
          onClick={(e) => { e.stopPropagation(); publishMut.mutate({ id: r.id, published: r.status === 'PUBLISHED' }); }}
          className="px-2 py-1 text-xs rounded-lg border border-gray-200 hover:bg-gray-50 transition"
        >{r.status === 'PUBLISHED' ? 'إلغاء النشر' : 'نشر'}</button>
        <button
          onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }}
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
        ><Trash2 size={14} /></button>
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader
        title="المستشفيات"
        subtitle={`${data?.meta.total ?? 0} مستشفى`}
        action="إضافة مستشفى"
        onAction={() => { setEditing(null); setModalOpen(true); }}
      />

      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="mb-4 max-w-xs">
          <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="بحث في المستشفيات..." />
        </div>
        <DataTable columns={columns} data={data?.data ?? []} loading={isLoading} />
        <Pagination
          page={page} totalPages={data?.meta.totalPages ?? 1}
          total={data?.meta.total ?? 0} pageSize={15}
          onPage={setPage}
        />
      </div>

      <HospitalModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        editing={editing}
        onSaved={() => { qc.invalidateQueries({ queryKey: ['hospitals'] }); setModalOpen(false); setEditing(null); }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMut.mutate(deleteTarget?.id)}
        loading={deleteMut.isPending}
        message={`هل تريد حذف مستشفى "${deleteTarget?.name?.ar}"؟`}
      />
    </div>
  );
}
