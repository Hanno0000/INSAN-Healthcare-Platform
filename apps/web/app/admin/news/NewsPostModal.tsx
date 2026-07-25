'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/admin/ui/Toast';
import Modal from '@/components/admin/ui/Modal';
import FormField, { inputCls, textareaCls, selectCls } from '@/components/admin/ui/FormField';
import BilingualInput from '@/components/admin/ui/BilingualInput';

interface Props { open: boolean; onClose: () => void; editing: any; onSaved: () => void; }

export default function NewsPostModal({ open, onClose, editing, onSaved }: Props) {
  const { toast } = useToast();
  const { register, handleSubmit, reset, setValue, watch } = useForm<any>({
    defaultValues: { title: { ar: '', en: '' }, excerpt: { ar: '', en: '' }, content: { ar: '', en: '' }, categoryId: '', coverImage: '' },
  });

  const { data: cats } = useQuery({ queryKey: ['news-cats-select'], queryFn: () => api.news.listCategories({ pageSize: 100 }) });

  useEffect(() => {
    reset(editing ? {
      title: editing.title ?? { ar: '', en: '' },
      excerpt: editing.excerpt ?? { ar: '', en: '' },
      content: editing.content ?? { ar: '', en: '' },
      categoryId: editing.categoryId ?? '',
      coverImage: editing.coverImage ?? '',
    } : { title: { ar: '', en: '' }, excerpt: { ar: '', en: '' }, content: { ar: '', en: '' }, categoryId: '', coverImage: '' });
  }, [editing, reset]);

  const mut = useMutation({
    mutationFn: (data: any) => editing ? api.news.updatePost(editing.id, data) : api.news.createPost(data),
    onSuccess: () => { toast('success', editing ? 'تم التحديث' : 'تم النشر'); onSaved(); },
    onError: (e: any) => toast('error', e.message),
  });

  const f = (k: string) => ({ ar: watch(`${k}.ar`), en: watch(`${k}.en`) });

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'تعديل المقال' : 'إضافة مقال'} size="xl">
      <form onSubmit={handleSubmit((d) => mut.mutate(d))} className="space-y-5">
        <FormField label="العنوان" required>
          <BilingualInput arValue={f('title').ar} enValue={f('title').en} onArChange={(v) => setValue('title.ar', v)} onEnChange={(v) => setValue('title.en', v)} placeholder={{ ar: 'عنوان المقال', en: 'Article title' }} />
        </FormField>
        <FormField label="المقتطف">
          <BilingualInput arValue={f('excerpt').ar} enValue={f('excerpt').en} onArChange={(v) => setValue('excerpt.ar', v)} onEnChange={(v) => setValue('excerpt.en', v)} multiline rows={2} placeholder={{ ar: 'مقتطف...', en: 'Excerpt...' }} />
        </FormField>
        <FormField label="المحتوى">
          <BilingualInput arValue={f('content').ar} enValue={f('content').en} onArChange={(v) => setValue('content.ar', v)} onEnChange={(v) => setValue('content.en', v)} multiline rows={6} placeholder={{ ar: 'اكتب المحتوى هنا...', en: 'Write content here...' }} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="التصنيف">
            <select {...register('categoryId')} className={selectCls}>
              <option value="">— اختر تصنيف —</option>
              {cats?.data.map((c: any) => <option key={c.id} value={c.id}>{c.name?.ar}</option>)}
            </select>
          </FormField>
          <FormField label="صورة الغلاف (رابط)">
            <input {...register('coverImage')} dir="ltr" className={inputCls} placeholder="https://..." />
          </FormField>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-xl border border-gray-200 hover:bg-gray-50 transition">إلغاء</button>
          <button type="submit" disabled={mut.isPending} className="px-5 py-2 text-sm rounded-xl bg-[#0B1F3A] text-white hover:bg-[#0E7C86] transition disabled:opacity-50">
            {mut.isPending ? 'جاري الحفظ...' : (editing ? 'حفظ' : 'إضافة')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
