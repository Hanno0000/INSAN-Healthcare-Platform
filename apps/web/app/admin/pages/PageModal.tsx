'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/admin/ui/Toast';
import Modal from '@/components/admin/ui/Modal';
import FormField, { inputCls, textareaCls } from '@/components/admin/ui/FormField';
import BilingualInput from '@/components/admin/ui/BilingualInput';

interface Props { open: boolean; onClose: () => void; editing: any; onSaved: () => void; }

export default function PageModal({ open, onClose, editing, onSaved }: Props) {
  const { toast } = useToast();
  const { register, handleSubmit, reset, setValue, watch } = useForm<any>({
    defaultValues: { title: { ar: '', en: '' }, metaTitle: { ar: '', en: '' }, metaDescription: { ar: '', en: '' }, slug: '' },
  });

  useEffect(() => {
    reset(editing ? {
      title: editing.title ?? { ar: '', en: '' },
      metaTitle: editing.metaTitle ?? { ar: '', en: '' },
      metaDescription: editing.metaDescription ?? { ar: '', en: '' },
      slug: editing.slug ?? '',
    } : { title: { ar: '', en: '' }, metaTitle: { ar: '', en: '' }, metaDescription: { ar: '', en: '' }, slug: '' });
  }, [editing, reset]);

  const mut = useMutation({
    mutationFn: (data: any) => editing ? api.pages.update(editing.id, data) : api.pages.create(data),
    onSuccess: () => { toast('success', editing ? 'تم التحديث' : 'تم إضافة الصفحة'); onSaved(); },
    onError: (e: any) => toast('error', e.message),
  });

  const f = (k: string) => ({ ar: watch(`${k}.ar`), en: watch(`${k}.en`) });

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'تعديل الصفحة' : 'إضافة صفحة'} size="lg">
      <form onSubmit={handleSubmit((d) => mut.mutate(d))} className="space-y-5">
        <FormField label="عنوان الصفحة" required>
          <BilingualInput arValue={f('title').ar} enValue={f('title').en} onArChange={(v) => setValue('title.ar', v)} onEnChange={(v) => setValue('title.en', v)} placeholder={{ ar: 'عنوان الصفحة', en: 'Page title' }} />
        </FormField>
        {!editing && (
          <FormField label="Slug" hint="مسار الصفحة في الرابط" required>
            <input {...register('slug')} dir="ltr" className={inputCls} placeholder="about-us" />
          </FormField>
        )}
        {editing && (
          <FormField label="Slug" hint="تغيير الـ slug سيُنشئ redirect تلقائي">
            <input {...register('slug')} dir="ltr" className={inputCls} />
          </FormField>
        )}
        <FormField label="عنوان SEO">
          <BilingualInput arValue={f('metaTitle').ar} enValue={f('metaTitle').en} onArChange={(v) => setValue('metaTitle.ar', v)} onEnChange={(v) => setValue('metaTitle.en', v)} placeholder={{ ar: 'عنوان SEO', en: 'SEO title' }} />
        </FormField>
        <FormField label="وصف SEO">
          <BilingualInput arValue={f('metaDescription').ar} enValue={f('metaDescription').en} onArChange={(v) => setValue('metaDescription.ar', v)} onEnChange={(v) => setValue('metaDescription.en', v)} multiline rows={2} placeholder={{ ar: 'وصف قصير...', en: 'Meta description...' }} />
        </FormField>
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
