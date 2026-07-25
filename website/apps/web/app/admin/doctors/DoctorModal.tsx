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

export default function DoctorModal({ open, onClose, editing, onSaved }: Props) {
  const { toast } = useToast();
  const { register, handleSubmit, reset, setValue, watch } = useForm<any>({
    defaultValues: { name: { ar: '', en: '' }, title: { ar: '', en: '' }, specialty: { ar: '', en: '' }, bio: { ar: '', en: '' }, phone: '', email: '', hospitalIds: [], medicalCenterIds: [] },
  });

  const { data: hospitals } = useQuery({ queryKey: ['hospitals-all'], queryFn: () => api.hospitals.list({ pageSize: 100 }) });
  const { data: centers } = useQuery({ queryKey: ['centers-all'], queryFn: () => api.medicalCenters.list({ pageSize: 100 }) });

  useEffect(() => {
    reset(editing ? {
      name: editing.name ?? { ar: '', en: '' },
      title: editing.title ?? { ar: '', en: '' },
      specialty: editing.specialty ?? { ar: '', en: '' },
      bio: editing.bio ?? { ar: '', en: '' },
      phone: editing.phone ?? '',
      email: editing.email ?? '',
      hospitalIds: editing.hospitals?.map((h: any) => h.id) ?? [],
      medicalCenterIds: editing.medicalCenters?.map((c: any) => c.id) ?? [],
    } : { name: { ar: '', en: '' }, title: { ar: '', en: '' }, specialty: { ar: '', en: '' }, bio: { ar: '', en: '' }, phone: '', email: '', hospitalIds: [], medicalCenterIds: [] });
  }, [editing, reset]);

  const mut = useMutation({
    mutationFn: (data: any) => editing ? api.doctors.update(editing.id, data) : api.doctors.create(data),
    onSuccess: () => { toast('success', editing ? 'تم التحديث' : 'تم إضافة الطبيب'); onSaved(); },
    onError: (e: any) => toast('error', e.message),
  });

  const f = (key: string) => ({ ar: watch(`${key}.ar`), en: watch(`${key}.en`) });

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'تعديل الطبيب' : 'إضافة طبيب'} size="lg">
      <form onSubmit={handleSubmit((d) => mut.mutate(d))} className="space-y-5">
        <FormField label="الاسم" required>
          <BilingualInput arValue={f('name').ar} enValue={f('name').en} onArChange={(v) => setValue('name.ar', v)} onEnChange={(v) => setValue('name.en', v)} placeholder={{ ar: 'اسم الطبيب', en: 'Doctor name' }} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="اللقب">
            <BilingualInput arValue={f('title').ar} enValue={f('title').en} onArChange={(v) => setValue('title.ar', v)} onEnChange={(v) => setValue('title.en', v)} placeholder={{ ar: 'د. / أ.د.', en: 'Dr. / Prof.' }} />
          </FormField>
          <FormField label="التخصص">
            <BilingualInput arValue={f('specialty').ar} enValue={f('specialty').en} onArChange={(v) => setValue('specialty.ar', v)} onEnChange={(v) => setValue('specialty.en', v)} placeholder={{ ar: 'التخصص', en: 'Specialty' }} />
          </FormField>
        </div>
        <FormField label="السيرة الذاتية">
          <BilingualInput arValue={f('bio').ar} enValue={f('bio').en} onArChange={(v) => setValue('bio.ar', v)} onEnChange={(v) => setValue('bio.en', v)} multiline rows={3} placeholder={{ ar: 'نبذة...', en: 'Bio...' }} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="الهاتف"><input {...register('phone')} dir="ltr" className={inputCls} placeholder="+966..." /></FormField>
          <FormField label="البريد"><input {...register('email')} type="email" dir="ltr" className={inputCls} /></FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="المستشفيات">
            <select multiple {...register('hospitalIds')} className={`${selectCls} h-24`}>
              {hospitals?.data.map((h: any) => <option key={h.id} value={h.id}>{h.name?.ar}</option>)}
            </select>
          </FormField>
          <FormField label="المراكز الطبية">
            <select multiple {...register('medicalCenterIds')} className={`${selectCls} h-24`}>
              {centers?.data.map((c: any) => <option key={c.id} value={c.id}>{c.name?.ar}</option>)}
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
