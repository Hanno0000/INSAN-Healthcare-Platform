'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/admin/ui/Toast';
import PageHeader from '@/components/admin/ui/PageHeader';
import DataTable from '@/components/admin/ui/DataTable';
import Pagination from '@/components/admin/ui/Pagination';
import SearchBar from '@/components/admin/ui/SearchBar';
import ConfirmDialog from '@/components/admin/ui/ConfirmDialog';
import UserModal from './UserModal';
import { Edit2, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';

export default function UsersClient() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search],
    queryFn: () => api.users.list({ page, pageSize: 15, search: search || undefined }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.users.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setDeleteTarget(null); toast('success', 'تم الحذف'); },
    onError: (e: any) => toast('error', e.message),
  });

  const columns = [
    { key: 'name', header: 'الاسم', render: (r: any) => (
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-[#0B1F3A]/10 flex items-center justify-center text-xs font-bold text-[#0B1F3A]">{r.name?.charAt(0)}</div>
        <div><p className="font-medium">{r.name}</p><p className="text-xs text-gray-400">{r.email}</p></div>
      </div>
    )},
    { key: 'role', header: 'الدور', render: (r: any) => (
      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{r.role?.name || r.roleName}</span>
    )},
    { key: 'isActive', header: 'الحالة', render: (r: any) => (
      <span className={clsx('text-xs px-2 py-0.5 rounded-full', r.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500')}>
        {r.isActive ? 'نشط' : 'موقوف'}
      </span>
    )},
    { key: 'lastLogin', header: 'آخر دخول', render: (r: any) => r.lastLogin ? new Date(r.lastLogin).toLocaleDateString('ar-EG') : '—' },
    { key: 'actions', header: '', width: '80px', render: (r: any) => (
      <div className="flex items-center gap-1">
        <button onClick={(e) => { e.stopPropagation(); setEditing(r); setModalOpen(true); }} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"><Edit2 size={14} /></button>
        <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"><Trash2 size={14} /></button>
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader title="المستخدمون" subtitle={`${data?.meta.total ?? 0} مستخدم`} action="إضافة مستخدم" onAction={() => { setEditing(null); setModalOpen(true); }} />
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="mb-4 max-w-xs"><SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="بحث في المستخدمين..." /></div>
        <DataTable columns={columns} data={data?.data ?? []} loading={isLoading} />
        <Pagination page={page} totalPages={data?.meta.totalPages ?? 1} total={data?.meta.total ?? 0} pageSize={15} onPage={setPage} />
      </div>
      <UserModal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} editing={editing} onSaved={() => { qc.invalidateQueries({ queryKey: ['users'] }); setModalOpen(false); setEditing(null); }} />
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteMut.mutate(deleteTarget?.id)} loading={deleteMut.isPending} message={`هل تريد حذف المستخدم "${deleteTarget?.name}"؟ هذا الإجراء لا يمكن التراجع عنه.`} />
    </div>
  );
}
