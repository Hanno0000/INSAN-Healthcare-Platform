'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/admin/ui/Toast';
import PageHeader from '@/components/admin/ui/PageHeader';
import DataTable from '@/components/admin/ui/DataTable';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import Pagination from '@/components/admin/ui/Pagination';
import ConfirmDialog from '@/components/admin/ui/ConfirmDialog';
import FaqModal from './FaqModal';
import { Edit2, Trash2 } from 'lucide-react';

export default function FaqsClient() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['faqs-admin', page],
    queryFn: () => api.faqs.list({ page, pageSize: 20 }),
  });

  const toggleActiveMut = useMutation({
    mutationFn: ({ id, isActive }: any) => api.faqs.update(id, { isActive: !isActive }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['faqs-admin'] }); toast('success', 'تم التحديث'); },
    onError: (e: any) => toast('error', e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.faqs.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['faqs-admin'] }); setDeleteTarget(null); toast('success', 'تم الحذف'); },
    onError: (e: any) => toast('error', e.message),
  });

  const columns = [
    { key: 'topic', header: 'الموضوع', width: '140px', render: (r: any) => <span className="text-xs text-gray-500">{r.topic?.ar || '—'}</span> },
    { key: 'question', header: 'السؤال', render: (r: any) => <p className="font-medium">{r.question?.ar}</p> },
    { key: 'order', header: 'الترتيب', width: '80px', render: (r: any) => r.order ?? 0 },
    { key: 'status', header: 'الحالة', render: (r: any) => <StatusBadge status={r.isActive ? 'PUBLISHED' : 'DRAFT'} /> },
    { key: 'actions', header: '', width: '120px', render: (r: any) => (
      <div className="flex items-center gap-1">
        <button onClick={(e) => { e.stopPropagation(); setEditing(r); setModalOpen(true); }} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"><Edit2 size={14} /></button>
        <button onClick={(e) => { e.stopPropagation(); toggleActiveMut.mutate({ id: r.id, isActive: r.isActive }); }} className="px-2 py-1 text-xs rounded-lg border border-gray-200 hover:bg-gray-50 transition">{r.isActive ? 'إخفاء' : 'إظهار'}</button>
        <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"><Trash2 size={14} /></button>
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader
        title="الأسئلة الشائعة"
        subtitle="إدارة الأسئلة والأجوبة التي تظهر في صفحة 'الأسئلة الشائعة' على الموقع."
        action="إضافة سؤال"
        onAction={() => { setEditing(null); setModalOpen(true); }}
      />
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <DataTable columns={columns} data={data?.data ?? []} loading={isLoading} />
        <Pagination page={page} totalPages={data?.meta.totalPages ?? 1} total={data?.meta.total ?? 0} pageSize={20} onPage={setPage} />
      </div>
      <FaqModal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} editing={editing} onSaved={() => { qc.invalidateQueries({ queryKey: ['faqs-admin'] }); setModalOpen(false); setEditing(null); }} />
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteMut.mutate(deleteTarget?.id)} loading={deleteMut.isPending} message={`هل تريد حذف السؤال "${deleteTarget?.question?.ar}"؟`} />
    </div>
  );
}
