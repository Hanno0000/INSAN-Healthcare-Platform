'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/admin/ui/Toast';
import Modal from '@/components/admin/ui/Modal';
import FormField, { inputCls, textareaCls, selectCls } from '@/components/admin/ui/FormField';
import BilingualInput from '@/components/admin/ui/BilingualInput';
import ImageUpload from '@/components/admin/ui/ImageUpload';

interface Props { open: boolean; onClose: () => void; editing: any; onSaved: () => void; }

const AUDIENCE_OPTIONS = [
  { value: 'PATIENT', label: 'مريض' },
  { value: 'DOCTOR', label: 'طبيب' },
  { value: 'INVESTOR', label: 'مستثمر' },
];

const DEFAULT_VALUES = { name: { ar: '', en: '' }, audience: 'PATIENT', quote: { ar: '', en: '' }, rating: 5, photo: '' };

export default function TestimonialModal({ open, onClose, editing, onSaved }: Props) {
  const { toast } = useToast();
  const { register, handleSubmit, reset, setValue, watch } = useForm<any>({
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    reset(editing ? {
      name: editing.name ?? { ar: '', en: '' },
      audience: editing.audience ?? 'PATIENT',
      quote: editing.quote ?? { ar: '', en: '' },
      photo: editing.photo ?? '',
      rating: editing.rating ?? 5,
    } : DEFAULT_VALUES);
  }, [editing, reset]);

  const mut = useMutation({
    mutationFn: (data: any) => editing ? api.testimonials.update(editing.id, data) : api.testimonials.create(data),
    onSuccess: () => { toast('success', editing ? 'تم التحديث' : 'تم الإضافة'); onSaved(); },
    onError: (e: any) => toast('error', e.message),
  });

  const f = (k: string) => ({ ar: watch(`${k}.ar`), en: watch(`${k}.en`) });

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'تعديل الشهادة' : 'إضافة شهادة'} size="lg">
      <form onSubmit={handleSubmit((d) => mut.mutate({ ...d, rating: Number(d.rating) }))} className="space-y-5">
        <FormField label="الاسم" required>
          <BilingualInput arValue={f('name').ar} enValue={f('name').en} onArChange={(v) => setValue('name.ar', v)} onEnChange={(v) => setValue('name.en', v)} placeholder={{ ar: 'اسم الشخص', en: 'Person name' }} />
        </FormField>
        <FormField label="النص" required>
          <BilingualInput arValue={f('quote').ar} enValue={f('quote').en} onArChange={(v) => setValue('quote.ar', v)} onEnChange={(v) => setValue('quote.en', v)} multiline rows={3} placeholder={{ ar: 'نص الشهادة...', en: 'Testimonial text...' }} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="الفئة" required>
            <select {...register('audience')} className={selectCls}>
              {AUDIENCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </FormField>
          <FormField label="التقييم">
            <select {...register('rating', { valueAsNumber: true })} className={selectCls}>
              {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} نجوم</option>)}
            </select>
          </FormField>
        </div>
        <ImageUpload label="صورة شخصية (Photo) - اختياري" value={watch('photo') || ''} onChange={(url) => setValue('photo', url)} />
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
