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
import TestimonialModal from './TestimonialModal';
import { Edit2, Trash2, Star } from 'lucide-react';

export default function TestimonialsClient() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['testimonials-admin', page],
    queryFn: () => api.testimonials.list({ page, pageSize: 15 }),
  });

  const publishMut = useMutation({
    mutationFn: ({ id, published }: any) => published ? api.testimonials.unpublish(id) : api.testimonials.publish(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['testimonials-admin'] }); toast('success', 'تم التحديث'); },
    onError: (e: any) => toast('error', e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.testimonials.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['testimonials-admin'] }); setDeleteTarget(null); toast('success', 'تم الحذف'); },
    onError: (e: any) => toast('error', e.message),
  });

  const columns = [
    { key: 'name', header: 'الاسم', render: (r: any) => <p className="font-medium">{r.name?.ar || r.name}</p> },
    { key: 'rating', header: 'التقييم', render: (r: any) => (
      <div className="flex items-center gap-0.5">{Array.from({ length: r.rating ?? 5 }).map((_, i) => <Star key={i} size={12} className="text-yellow-400 fill-yellow-400" />)}</div>
    )},
    { key: 'audience', header: 'الفئة', render: (r: any) => ({ PATIENT: 'مريض', DOCTOR: 'طبيب', INVESTOR: 'مستثمر' }[r.audience as string] ?? r.audience ?? '—') },
    { key: 'status', header: 'الحالة', render: (r: any) => <StatusBadge status={r.status} /> },
    { key: 'actions', header: '', width: '120px', render: (r: any) => (
      <div className="flex items-center gap-1">
        <button onClick={(e) => { e.stopPropagation(); setEditing(r); setModalOpen(true); }} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"><Edit2 size={14} /></button>
        <button onClick={(e) => { e.stopPropagation(); publishMut.mutate({ id: r.id, published: r.status === 'PUBLISHED' }); }} className="px-2 py-1 text-xs rounded-lg border border-gray-200 hover:bg-gray-50 transition">{r.status === 'PUBLISHED' ? 'إلغاء' : 'نشر'}</button>
        <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"><Trash2 size={14} /></button>
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader 
        title="آراء العملاء (قالوا عنا)" 
        subtitle="إدارة الشهادات وآراء المرضى والعملاء، الأطباء والمستثمرين التي تُعرض في أقسام 'قالوا عنا' على الموقع." 
        action="إضافة شهادة" 
        onAction={() => { setEditing(null); setModalOpen(true); }} 
      />
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <DataTable columns={columns} data={data?.data ?? []} loading={isLoading} />
        <Pagination page={page} totalPages={data?.meta.totalPages ?? 1} total={data?.meta.total ?? 0} pageSize={15} onPage={setPage} />
      </div>
      <TestimonialModal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} editing={editing} onSaved={() => { qc.invalidateQueries({ queryKey: ['testimonials-admin'] }); setModalOpen(false); setEditing(null); }} />
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteMut.mutate(deleteTarget?.id)} loading={deleteMut.isPending} message={`هل تريد حذف شهادة "${deleteTarget?.name?.ar}"؟`} />
    </div>
  );
}
