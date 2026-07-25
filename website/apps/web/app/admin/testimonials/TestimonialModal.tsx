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

export default function TestimonialModal({ open, onClose, editing, onSaved }: Props) {
  const { toast } = useToast();
  const { register, handleSubmit, reset, setValue, watch } = useForm<any>({
    defaultValues: { name: { ar: '', en: '' }, content: { ar: '', en: '' }, role: { ar: '', en: '' }, rating: 5, hospitalId: '' },
  });

  const { data: hospitals } = useQuery({ queryKey: ['hospitals-all'], queryFn: () => api.hospitals.list({ pageSize: 100 }) });

  useEffect(() => {
    reset(editing ? {
      name: editing.name ?? { ar: '', en: '' },
      content: editing.content ?? { ar: '', en: '' },
      role: editing.role ?? { ar: '', en: '' },
      rating: editing.rating ?? 5,
      hospitalId: editing.hospitalId ?? '',
    } : { name: { ar: '', en: '' }, content: { ar: '', en: '' }, role: { ar: '', en: '' }, rating: 5, hospitalId: '' });
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
        <FormField label="الدور / الصفة">
          <BilingualInput arValue={f('role').ar} enValue={f('role').en} onArChange={(v) => setValue('role.ar', v)} onEnChange={(v) => setValue('role.en', v)} placeholder={{ ar: 'مريض / ذوي مريض', en: 'Patient / Family' }} />
        </FormField>
        <FormField label="النص" required>
          <BilingualInput arValue={f('content').ar} enValue={f('content').en} onArChange={(v) => setValue('content.ar', v)} onEnChange={(v) => setValue('content.en', v)} multiline rows={3} placeholder={{ ar: 'نص الشهادة...', en: 'Testimonial text...' }} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="التقييم">
            <select {...register('rating', { valueAsNumber: true })} className={selectCls}>
              {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} نجوم</option>)}
            </select>
          </FormField>
          <FormField label="المستشفى">
            <select {...register('hospitalId')} className={selectCls}>
              <option value="">— اختياري —</option>
              {hospitals?.data.map((h: any) => <option key={h.id} value={h.id}>{h.name?.ar}</option>)}
            </select>
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
