'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/admin/ui/Toast';
import PageHeader from '@/components/admin/ui/PageHeader';
import DataTable from '@/components/admin/ui/DataTable';
import ConfirmDialog from '@/components/admin/ui/ConfirmDialog';
import NavigationModal from './NavigationModal';
import { Edit2, Trash2 } from 'lucide-react';

const LOCATIONS = [
  { key: 'header', label: 'الرأس' },
  { key: 'footer', label: 'التذييل' },
  { key: 'footer_secondary', label: 'التذييل الثانوي' },
];

export default function NavigationClient() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [location, setLocation] = useState('header');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['navigation', location],
    queryFn: () => api.navigation.list({ location }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.navigation.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['navigation'] }); setDeleteTarget(null); toast('success', 'تم الحذف'); },
    onError: (e: any) => toast('error', e.message),
  });

  const columns = [
    { key: 'order', header: '#', width: '50px', render: (r: any) => <span className="text-gray-400 text-xs">{r.order}</span> },
    { key: 'label', header: 'التسمية', render: (r: any) => <div><p className="font-medium">{r.label?.ar}</p><p className="text-xs text-gray-400">{r.label?.en}</p></div> },
    { key: 'href', header: 'الرابط', render: (r: any) => <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{r.href}</code> },
    { key: 'isExternal', header: 'خارجي', render: (r: any) => r.isExternal ? '✓' : '—' },
    { key: 'actions', header: '', width: '80px', render: (r: any) => (
      <div className="flex items-center gap-1">
        <button onClick={(e) => { e.stopPropagation(); setEditing(r); setModalOpen(true); }} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"><Edit2 size={14} /></button>
        <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"><Trash2 size={14} /></button>
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader title="التنقل" subtitle="إدارة قوائم التنقل" action="إضافة رابط" onAction={() => { setEditing(null); setModalOpen(true); }} />

      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        {/* Location tabs */}
        <div className="flex gap-2 mb-4">
          {LOCATIONS.map((l) => (
            <button key={l.key} onClick={() => setLocation(l.key)}
              className={`px-3 py-1.5 text-sm rounded-lg transition ${location === l.key ? 'bg-[#0B1F3A] text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
              {l.label}
            </button>
          ))}
        </div>
        <DataTable columns={columns} data={(data?.data as any[] ?? [])} loading={isLoading} />
      </div>

      <NavigationModal
        open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }}
        editing={editing} defaultLocation={location}
        onSaved={() => { qc.invalidateQueries({ queryKey: ['navigation'] }); setModalOpen(false); setEditing(null); }}
      />
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteMut.mutate(deleteTarget?.id)} loading={deleteMut.isPending} message={`هل تريد حذف "${deleteTarget?.label?.ar}"؟`} />
    </div>
  );
}
