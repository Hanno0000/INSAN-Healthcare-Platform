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
import Modal from '@/components/admin/ui/Modal';
import ConfirmDialog from '@/components/admin/ui/ConfirmDialog';
import FormField, { selectCls } from '@/components/admin/ui/FormField';
import { Eye, Trash2, UserCheck, UserX } from 'lucide-react';

const STATUSES = ['NEW', 'CONTACTED', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'ATTENDED', 'NO_SHOW'];

const STATUS_LABELS: Record<string, string> = {
  NEW: 'جديد',
  CONTACTED: 'تم التواصل',
  CONFIRMED: 'مؤكد',
  CANCELLED: 'ملغي',
  COMPLETED: 'مكتمل',
  ATTENDED: 'حضر',
  NO_SHOW: 'لم يحضر',
};

export default function AppointmentsClient() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [newStatus, setNewStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['appointments', page, search, statusFilter],
    queryFn: () => api.appointments.list({ page, pageSize: 15, search: search || undefined, filter: statusFilter ? { status: statusFilter } : undefined }),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status, notes }: any) => api.appointments.updateStatus(id, status, notes),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['appointments'] }); setSelected(null); toast('success', 'تم تحديث الحالة'); },
    onError: (e: any) => toast('error', e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.appointments.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['appointments'] }); setDeleteId(null); toast('success', 'تم حذف الموعد'); },
    onError: (e: any) => toast('error', e.message),
  });

  const quickStatus = (id: string, status: string) => {
    statusMut.mutate({ id, status });
  };

  const columns = [
    { key: 'name', header: 'الاسم', render: (r: any) => <p className="font-medium">{r.name}</p> },
    { key: 'phone', header: 'الهاتف', render: (r: any) => <span dir="ltr" className="text-sm">{r.phone}</span> },
    { key: 'hospital', header: 'المستشفى', render: (r: any) => r.hospital?.name?.ar || '—' },
    { key: 'preferredDate', header: 'التاريخ المفضل', render: (r: any) => r.preferredDate ? new Date(r.preferredDate).toLocaleDateString('ar-EG') : '—' },
    { key: 'status', header: 'الحالة', render: (r: any) => <StatusBadge status={r.status} /> },
    { key: 'createdAt', header: 'وقت الطلب', render: (r: any) => new Date(r.createdAt).toLocaleDateString('ar-EG') },
    {
      key: 'actions', header: '', width: '120px', render: (r: any) => (
        <div className="flex gap-1 items-center" onClick={(e) => e.stopPropagation()}>
          <button
            title="حضر"
            onClick={() => quickStatus(r.id, 'ATTENDED')}
            className="p-1.5 rounded-lg text-green-500 hover:bg-green-50 transition"
          >
            <UserCheck size={14} />
          </button>
          <button
            title="لم يحضر"
            onClick={() => quickStatus(r.id, 'NO_SHOW')}
            className="p-1.5 rounded-lg text-orange-500 hover:bg-orange-50 transition"
          >
            <UserX size={14} />
          </button>
          <button
            onClick={() => { setSelected(r); setNewStatus(r.status); setNotes(r.notes ?? ''); }}
            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"
          >
            <Eye size={14} />
          </button>
          <button
            onClick={() => setDeleteId(r.id)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )
    },
  ];

  return (
    <div>
      <PageHeader title="المواعيد" subtitle={`${data?.meta.total ?? 0} طلب`} />
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex gap-3 mb-4">
          <div className="flex-1 max-w-xs"><SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="بحث بالاسم أو الهاتف..." /></div>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">كل الحالات</option>
            {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>)}
          </select>
        </div>
        <DataTable columns={columns} data={data?.data ?? []} loading={isLoading} onRowClick={(r) => { setSelected(r); setNewStatus(r.status); setNotes(r.notes ?? ''); }} />
        <Pagination page={page} totalPages={data?.meta.totalPages ?? 1} total={data?.meta.total ?? 0} pageSize={15} onPage={setPage} />
      </div>

      {/* Detail modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="تفاصيل الطلب" size="md">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-xs text-gray-400">الاسم</p><p className="font-medium">{selected.name}</p></div>
              <div><p className="text-xs text-gray-400">الهاتف</p><p dir="ltr">{selected.phone}</p></div>
              <div><p className="text-xs text-gray-400">البريد</p><p dir="ltr">{selected.email || '—'}</p></div>
              <div><p className="text-xs text-gray-400">المستشفى</p><p>{selected.hospital?.name?.ar || '—'}</p></div>
              <div><p className="text-xs text-gray-400">المركز الطبي</p><p>{selected.medicalCenter?.name?.ar || '—'}</p></div>
              <div><p className="text-xs text-gray-400">الطبيب</p><p>{selected.doctor?.name?.ar || '—'}</p></div>
              <div><p className="text-xs text-gray-400">التاريخ المفضل</p><p>{selected.preferredDate ? new Date(selected.preferredDate).toLocaleDateString('ar-EG') : '—'}</p></div>
              <div><p className="text-xs text-gray-400">تاريخ الطلب</p><p>{new Date(selected.createdAt).toLocaleDateString('ar-EG')}</p></div>
            </div>
            {selected.message && <div><p className="text-xs text-gray-400 mb-1">الرسالة</p><p className="text-sm bg-gray-50 rounded-xl p-3">{selected.message}</p></div>}

            {/* Quick attendance buttons */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => statusMut.mutate({ id: selected.id, status: 'ATTENDED', notes })}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-green-50 text-green-700 hover:bg-green-100 transition text-sm font-medium"
              >
                <UserCheck size={16} /> حضر العميل
              </button>
              <button
                onClick={() => statusMut.mutate({ id: selected.id, status: 'NO_SHOW', notes })}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-orange-50 text-orange-700 hover:bg-orange-100 transition text-sm font-medium"
              >
                <UserX size={16} /> لم يحضر
              </button>
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-3">
              <FormField label="تغيير الحالة">
                <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className={selectCls}>
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>)}
                </select>
              </FormField>
              <FormField label="ملاحظات">
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} dir="rtl" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </FormField>
              <div className="flex justify-end gap-3">
                <button onClick={() => setSelected(null)} className="px-4 py-2 text-sm rounded-xl border border-gray-200 hover:bg-gray-50 transition">إغلاق</button>
                <button
                  onClick={() => statusMut.mutate({ id: selected.id, status: newStatus, notes })}
                  disabled={statusMut.isPending}
                  className="px-5 py-2 text-sm rounded-xl bg-[#0B1F3A] text-white hover:bg-[#0E7C86] transition disabled:opacity-50"
                >{statusMut.isPending ? 'جاري الحفظ...' : 'حفظ الحالة'}</button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteMut.mutate(deleteId!)}
        loading={deleteMut.isPending}
        message="هل تريد بالتأكيد حذف هذا الموعد؟ لا يمكن التراجع عن هذا الإجراء."
      />
    </div>
  );
}
