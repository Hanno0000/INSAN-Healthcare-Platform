'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/admin/ui/Toast';
import Modal from '@/components/admin/ui/Modal';
import FormField, { inputCls, selectCls } from '@/components/admin/ui/FormField';
import BilingualInput from '@/components/admin/ui/BilingualInput';

interface Props { open: boolean; onClose: () => void; editing: any; defaultLocation: string; onSaved: () => void; }

export default function NavigationModal({ open, onClose, editing, defaultLocation, onSaved }: Props) {
  const { toast } = useToast();
  const { register, handleSubmit, reset, setValue, watch } = useForm<any>({
    defaultValues: { label: { ar: '', en: '' }, href: '', location: defaultLocation, isExternal: false, order: 1 },
  });

  useEffect(() => {
    reset(editing ? {
      label: editing.label ?? { ar: '', en: '' },
      href: editing.href ?? '',
      location: editing.location ?? defaultLocation,
      isExternal: editing.isExternal ?? false,
      order: editing.order ?? 1,
    } : { label: { ar: '', en: '' }, href: '', location: defaultLocation, isExternal: false, order: 1 });
  }, [editing, defaultLocation, reset]);

  const mut = useMutation({
    mutationFn: (data: any) => editing ? api.navigation.update(editing.id, data) : api.navigation.create(data),
    onSuccess: () => { toast('success', editing ? 'تم التحديث' : 'تم الإضافة'); onSaved(); },
    onError: (e: any) => toast('error', e.message),
  });

  const l = { ar: watch('label.ar'), en: watch('label.en') };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'تعديل الرابط' : 'إضافة رابط'} size="md">
      <form onSubmit={handleSubmit((d) => mut.mutate({ ...d, isExternal: d.isExternal === 'true' || d.isExternal === true }))} className="space-y-5">
        <FormField label="التسمية" required>
          <BilingualInput arValue={l.ar} enValue={l.en} onArChange={(v) => setValue('label.ar', v)} onEnChange={(v) => setValue('label.en', v)} placeholder={{ ar: 'عن منظومة إنسان', en: 'About INSAN' }} />
        </FormField>
        <FormField label="الرابط" required>
          <input {...register('href')} dir="ltr" className={inputCls} placeholder="/about" />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="الموقع">
            <select {...register('location')} className={selectCls}>
              <option value="header">الرأس</option>
              <option value="footer">التذييل</option>
              <option value="footer_secondary">التذييل الثانوي</option>
            </select>
          </FormField>
          <FormField label="الترتيب">
            <input {...register('order', { valueAsNumber: true })} type="number" min={1} className={inputCls} />
          </FormField>
        </div>
        <FormField label="رابط خارجي">
          <label className="flex items-center gap-2 cursor-pointer">
            <input {...register('isExternal')} type="checkbox" className="w-4 h-4 rounded" />
            <span className="text-sm text-gray-600">يفتح في نافذة جديدة</span>
          </label>
        </FormField>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-xl border border-gray-200 hover:bg-gray-50 transition">إلغاء</button>
          <button type="submit" disabled={mut.isPending} className="px-5 py-2 text-sm rounded-xl bg-[#0B1F3A] text-white hover:bg-[#0E7C86] transition disabled:opacity-50">
            {mut.isPending ? 'جاري الحفظ...' : (editing ? 'حفظ' : 'إضافة')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
