'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/admin/ui/Toast';
import Modal from '@/components/admin/ui/Modal';
import FormField, { inputCls } from '@/components/admin/ui/FormField';
import BilingualInput from '@/components/admin/ui/BilingualInput';

interface Props { open: boolean; onClose: () => void; editing: any; onSaved: () => void; }

export default function BrandModal({ open, onClose, editing, onSaved }: Props) {
  const { toast } = useToast();
  const { register, handleSubmit, reset, setValue, watch } = useForm<any>({
    defaultValues: { code: '', name: { ar: '', en: '' }, description: { ar: '', en: '' }, primaryColor: '#0B1F3A', website: '', isActive: true },
  });

  useEffect(() => {
    reset(editing ? {
      code: editing.code ?? '',
      name: editing.name ?? { ar: '', en: '' },
      description: editing.description ?? { ar: '', en: '' },
      primaryColor: editing.primaryColor ?? '#0B1F3A',
      website: editing.website ?? '',
      isActive: editing.isActive ?? true,
    } : { code: '', name: { ar: '', en: '' }, description: { ar: '', en: '' }, primaryColor: '#0B1F3A', website: '', isActive: true });
  }, [editing, reset]);

  const mut = useMutation({
    mutationFn: (data: any) => editing ? api.brands.update(editing.id, data) : api.brands.create(data),
    onSuccess: () => { toast('success', editing ? 'تم التحديث' : 'تم الإضافة'); onSaved(); },
    onError: (e: any) => toast('error', e.message),
  });

  const f = (k: string) => ({ ar: watch(`${k}.ar`), en: watch(`${k}.en`) });

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'تعديل العلامة' : 'إضافة علامة تجارية'} size="md">
      <form onSubmit={handleSubmit((d) => mut.mutate(d))} className="space-y-5">
        <FormField label="كود العلامة" required hint="مثال: INSAN — حروف كبيرة فقط">
          <input {...register('code', { required: true })} dir="ltr" className={inputCls} placeholder="INSAN" disabled={!!editing} />
        </FormField>
        <FormField label="الاسم" required>
          <BilingualInput arValue={f('name').ar} enValue={f('name').en} onArChange={(v) => setValue('name.ar', v)} onEnChange={(v) => setValue('name.en', v)} placeholder={{ ar: 'منظومة إنسان', en: 'INSAN Group' }} />
        </FormField>
        <FormField label="الوصف">
          <BilingualInput arValue={f('description').ar} enValue={f('description').en} onArChange={(v) => setValue('description.ar', v)} onEnChange={(v) => setValue('description.en', v)} multiline rows={2} placeholder={{ ar: 'وصف...', en: 'Description...' }} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="اللون الرئيسي">
            <div className="flex items-center gap-2">
              <input {...register('primaryColor')} type="color" className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
              <input {...register('primaryColor')} dir="ltr" className={`${inputCls} flex-1`} placeholder="#0B1F3A" />
            </div>
          </FormField>
          <FormField label="الموقع الإلكتروني">
            <input {...register('website')} dir="ltr" type="url" className={inputCls} placeholder="https://..." />
          </FormField>
        </div>
        <FormField label="الحالة">
          <label className="flex items-center gap-2 cursor-pointer">
            <input {...register('isActive')} type="checkbox" defaultChecked className="w-4 h-4 rounded" />
            <span className="text-sm text-gray-600">علامة نشطة</span>
          </label>
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
