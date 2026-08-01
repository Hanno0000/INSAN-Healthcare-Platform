'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/admin/ui/Toast';
import PageHeader from '@/components/admin/ui/PageHeader';
import DataTable from '@/components/admin/ui/DataTable';
import ConfirmDialog from '@/components/admin/ui/ConfirmDialog';
import BrandModal from './BrandModal';
import { Edit2, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';

export default function BrandsClient() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const { data, isLoading } = useQuery({ queryKey: ['brands'], queryFn: () => api.brands.list() });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.brands.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['brands'] }); setDeleteTarget(null); toast('success', 'تم الحذف'); },
    onError: (e: any) => toast('error', e.message),
  });

  const columns = [
    { key: 'code', header: 'الكود', render: (r: any) => <code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-bold">{r.code}</code> },
    { key: 'name', header: 'الاسم', render: (r: any) => <div><p className="font-medium">{r.name?.ar}</p><p className="text-xs text-gray-400">{r.name?.en}</p></div> },
    { key: 'primaryColor', header: 'اللون', render: (r: any) => r.primaryColor ? (
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded" style={{ backgroundColor: r.primaryColor }} />
        <span className="text-xs font-mono text-gray-500">{r.primaryColor}</span>
      </div>
    ) : '—' },
    { key: 'socialAccounts', header: 'حسابات التواصل', render: (r: any) => (
      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{r.socialAccounts?.length ?? 0}</span>
    )},
    { key: 'isActive', header: 'الحالة', render: (r: any) => (
      <span className={clsx('text-xs px-2 py-0.5 rounded-full', r.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500')}>
        {r.isActive ? 'نشط' : 'غير نشط'}
      </span>
    )},
    { key: 'actions', header: '', width: '80px', render: (r: any) => (
      <div className="flex items-center gap-1">
        <button onClick={(e) => { e.stopPropagation(); setEditing(r); setModalOpen(true); }} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"><Edit2 size={14} /></button>
        <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"><Trash2 size={14} /></button>
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader 
        title="الفروع والمؤسسات التابعة (العلامات التجارية)" 
        subtitle="إدارة العلامات التجارية الفرعية ومواقع التواصل الاجتماعي الخاصة بها" 
        action="إضافة علامة" 
        onAction={() => { setEditing(null); setModalOpen(true); }} 
      />
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <DataTable columns={columns} data={(data?.data as any[] ?? [])} loading={isLoading} />
      </div>
      <BrandModal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} editing={editing} onSaved={() => { qc.invalidateQueries({ queryKey: ['brands'] }); setModalOpen(false); setEditing(null); }} />
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteMut.mutate(deleteTarget?.id)} loading={deleteMut.isPending} message={`هل تريد حذف العلامة "${deleteTarget?.name?.ar}"؟`} />
    </div>
  );
}
