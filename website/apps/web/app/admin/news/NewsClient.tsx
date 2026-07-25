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
import NewsPostModal from './NewsPostModal';
import NewsCategoryModal from './NewsCategoryModal';
import { Edit2, Trash2, Tag } from 'lucide-react';

export default function NewsClient() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = useState<'posts' | 'categories'>('posts');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [postModal, setPostModal] = useState(false);
  const [catModal, setCatModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const posts = useQuery({
    queryKey: ['news-posts', page, search],
    queryFn: () => api.news.listPosts({ page, pageSize: 15, search: search || undefined }),
    enabled: tab === 'posts',
  });

  const categories = useQuery({
    queryKey: ['news-cats'],
    queryFn: () => api.news.listCategories({ pageSize: 100 }),
    enabled: tab === 'categories',
  });

  const publishMut = useMutation({
    mutationFn: ({ id, published }: any) => published ? api.news.unpublishPost(id) : api.news.publishPost(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['news-posts'] }); toast('success', 'تم تحديث النشر'); },
    onError: (e: any) => toast('error', e.message),
  });

  const deletePostMut = useMutation({
    mutationFn: (id: string) => api.news.deletePost(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['news-posts'] }); setDeleteTarget(null); toast('success', 'تم الحذف'); },
    onError: (e: any) => toast('error', e.message),
  });

  const deleteCatMut = useMutation({
    mutationFn: (id: string) => api.news.deleteCategory(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['news-cats'] }); setDeleteTarget(null); toast('success', 'تم الحذف'); },
    onError: (e: any) => toast('error', e.message),
  });

  const postColumns = [
    { key: 'title', header: 'العنوان', render: (r: any) => (
      <div><p className="font-medium">{r.title?.ar}</p><p className="text-xs text-gray-400">{r.title?.en}</p></div>
    )},
    { key: 'category', header: 'التصنيف', render: (r: any) => r.category?.name?.ar || '—' },
    { key: 'status', header: 'الحالة', render: (r: any) => <StatusBadge status={r.status} /> },
    { key: 'createdAt', header: 'التاريخ', render: (r: any) => new Date(r.createdAt).toLocaleDateString('ar-EG') },
    { key: 'actions', header: '', width: '120px', render: (r: any) => (
      <div className="flex items-center gap-1">
        <button onClick={(e) => { e.stopPropagation(); setEditing(r); setPostModal(true); }} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"><Edit2 size={14} /></button>
        <button onClick={(e) => { e.stopPropagation(); publishMut.mutate({ id: r.id, published: r.status === 'PUBLISHED' }); }} className="px-2 py-1 text-xs rounded-lg border border-gray-200 hover:bg-gray-50 transition">{r.status === 'PUBLISHED' ? 'إلغاء' : 'نشر'}</button>
        <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"><Trash2 size={14} /></button>
      </div>
    )},
  ];

  const catColumns = [
    { key: 'name', header: 'الاسم', render: (r: any) => <div><p className="font-medium">{r.name?.ar}</p><p className="text-xs text-gray-400">{r.name?.en}</p></div> },
    { key: 'slug', header: 'Slug', render: (r: any) => <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{r.slug}</code> },
    { key: 'actions', header: '', width: '80px', render: (r: any) => (
      <div className="flex items-center gap-1">
        <button onClick={(e) => { e.stopPropagation(); setEditing(r); setCatModal(true); }} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"><Edit2 size={14} /></button>
        <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"><Trash2 size={14} /></button>
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader
        title="الأخبار"
        action={tab === 'posts' ? 'إضافة خبر' : 'إضافة تصنيف'}
        onAction={() => { setEditing(null); tab === 'posts' ? setPostModal(true) : setCatModal(true); }}
        extra={
          <button onClick={() => setTab(tab === 'posts' ? 'categories' : 'posts')} className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl border border-gray-200 hover:bg-gray-50 transition">
            <Tag size={14} /> {tab === 'posts' ? 'التصنيفات' : 'المقالات'}
          </button>
        }
      />

      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {(['posts', 'categories'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 text-sm rounded-lg transition ${tab === t ? 'bg-[#0B1F3A] text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
              {t === 'posts' ? 'المقالات' : 'التصنيفات'}
            </button>
          ))}
        </div>

        {tab === 'posts' && (
          <>
            <div className="mb-4 max-w-xs"><SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="بحث في المقالات..." /></div>
            <DataTable columns={postColumns} data={posts.data?.data ?? []} loading={posts.isLoading} />
            <Pagination page={page} totalPages={posts.data?.meta.totalPages ?? 1} total={posts.data?.meta.total ?? 0} pageSize={15} onPage={setPage} />
          </>
        )}

        {tab === 'categories' && (
          <DataTable columns={catColumns} data={categories.data?.data ?? []} loading={categories.isLoading} />
        )}
      </div>

      <NewsPostModal open={postModal} onClose={() => { setPostModal(false); setEditing(null); }} editing={editing} onSaved={() => { qc.invalidateQueries({ queryKey: ['news-posts'] }); setPostModal(false); setEditing(null); }} />
      <NewsCategoryModal open={catModal} onClose={() => { setCatModal(false); setEditing(null); }} editing={editing} onSaved={() => { qc.invalidateQueries({ queryKey: ['news-cats'] }); setCatModal(false); setEditing(null); }} />

      <ConfirmDialog
        open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={() => tab === 'posts' ? deletePostMut.mutate(deleteTarget?.id) : deleteCatMut.mutate(deleteTarget?.id)}
        loading={deletePostMut.isPending || deleteCatMut.isPending}
        message={`هل تريد حذف "${deleteTarget?.title?.ar || deleteTarget?.name?.ar}"؟`}
      />
    </div>
  );
}
