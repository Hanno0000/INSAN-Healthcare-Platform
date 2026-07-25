'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/admin/ui/Toast';
import Modal from '@/components/admin/ui/Modal';
import FormField, { inputCls, selectCls } from '@/components/admin/ui/FormField';
import BilingualInput from '@/components/admin/ui/BilingualInput';

interface Props { open: boolean; onClose: () => void; editing: any; onSaved: () => void; }

export default function MedicalCenterModal({ open, onClose, editing, onSaved }: Props) {
  const { toast } = useToast();
  const { register, handleSubmit, reset, setValue, watch } = useForm<any>({
    defaultValues: { name: { ar: '', en: '' }, specialty: { ar: '', en: '' }, description: { ar: '', en: '' }, phone: '', email: '', hospitalIds: [] },
  });

  const { data: hospitals } = useQuery({ queryKey: ['hospitals-all'], queryFn: () => api.hospitals.list({ pageSize: 100 }) });

  useEffect(() => {
    reset(editing ? {
      name: editing.name ?? { ar: '', en: '' },
      specialty: editing.specialty ?? { ar: '', en: '' },
      description: editing.description ?? { ar: '', en: '' },
      phone: editing.phone ?? '',
      email: editing.email ?? '',
      hospitalIds: editing.hospitals?.map((h: any) => h.id) ?? [],
    } : { name: { ar: '', en: '' }, specialty: { ar: '', en: '' }, description: { ar: '', en: '' }, phone: '', email: '', hospitalIds: [] });
  }, [editing, reset]);

  const mut = useMutation({
    mutationFn: (data: any) => editing ? api.medicalCenters.update(editing.id, data) : api.medicalCenters.create(data),
    onSuccess: () => { toast('success', editing ? 'تم التحديث' : 'تم الإضافة'); onSaved(); },
    onError: (e: any) => toast('error', e.message),
  });

  const n = { ar: watch('name.ar'), en: watch('name.en') };
  const s = { ar: watch('specialty.ar'), en: watch('specialty.en') };
  const d = { ar: watch('description.ar'), en: watch('description.en') };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'تعديل المركز الطبي' : 'إضافة مركز طبي'} size="lg">
      <form onSubmit={handleSubmit((d) => mut.mutate(d))} className="space-y-5">
        <FormField label="الاسم" required>
          <BilingualInput arValue={n.ar} enValue={n.en} onArChange={(v) => setValue('name.ar', v)} onEnChange={(v) => setValue('name.en', v)} placeholder={{ ar: 'اسم المركز', en: 'Center name' }} />
        </FormField>
        <FormField label="التخصص">
          <BilingualInput arValue={s.ar} enValue={s.en} onArChange={(v) => setValue('specialty.ar', v)} onEnChange={(v) => setValue('specialty.en', v)} placeholder={{ ar: 'التخصص', en: 'Specialty' }} />
        </FormField>
        <FormField label="الوصف">
          <BilingualInput arValue={d.ar} enValue={d.en} onArChange={(v) => setValue('description.ar', v)} onEnChange={(v) => setValue('description.en', v)} multiline rows={3} placeholder={{ ar: 'وصف...' , en: 'Description...' }} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="الهاتف"><input {...register('phone')} dir="ltr" className={inputCls} placeholder="+966..." /></FormField>
          <FormField label="البريد"><input {...register('email')} type="email" dir="ltr" className={inputCls} placeholder="center@..." /></FormField>
        </div>
        <FormField label="المستشفيات المرتبطة" hint="اختر مستشفى واحداً أو أكثر">
          <select multiple {...register('hospitalIds')} className={`${selectCls} h-28`}>
            {hospitals?.data.map((h: any) => <option key={h.id} value={h.id}>{h.name?.ar}</option>)}
          </select>
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
