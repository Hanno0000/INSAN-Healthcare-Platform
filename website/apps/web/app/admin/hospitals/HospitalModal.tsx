'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/admin/ui/Toast';
import Modal from '@/components/admin/ui/Modal';
import FormField, { inputCls, textareaCls, selectCls } from '@/components/admin/ui/FormField';
import BilingualInput from '@/components/admin/ui/BilingualInput';

interface Props {
  open: boolean;
  onClose: () => void;
  editing: any;
  onSaved: () => void;
}

export default function HospitalModal({ open, onClose, editing, onSaved }: Props) {
  const { toast } = useToast();
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<any>({
    defaultValues: { name: { ar: '', en: '' }, description: { ar: '', en: '' }, city: { ar: '', en: '' }, address: { ar: '', en: '' }, phone: '', email: '', website: '', brandId: '' },
  });

  const { data: brands } = useQuery({ queryKey: ['brands-list'], queryFn: () => api.brands.list() });

  useEffect(() => {
    if (editing) {
      reset({
        name: editing.name ?? { ar: '', en: '' },
        description: editing.description ?? { ar: '', en: '' },
        city: editing.city ?? { ar: '', en: '' },
        address: editing.address ?? { ar: '', en: '' },
        phone: editing.phone ?? '',
        email: editing.email ?? '',
        website: editing.website ?? '',
        brandId: editing.brandId ?? '',
        googleMapsUrl: editing.googleMapsUrl ?? '',
      });
    } else {
      reset({ name: { ar: '', en: '' }, description: { ar: '', en: '' }, city: { ar: '', en: '' }, address: { ar: '', en: '' }, phone: '', email: '', website: '', brandId: '', googleMapsUrl: '' });
    }
  }, [editing, reset]);

  const mut = useMutation({
    mutationFn: (data: any) => editing ? api.hospitals.update(editing.id, data) : api.hospitals.create(data),
    onSuccess: () => { toast('success', editing ? 'تم تحديث المستشفى' : 'تم إضافة المستشفى'); onSaved(); },
    onError: (e: any) => toast('error', e.message),
  });

  const nameAr = watch('name.ar'); const nameEn = watch('name.en');
  const descAr = watch('description.ar'); const descEn = watch('description.en');
  const cityAr = watch('city.ar'); const cityEn = watch('city.en');
  const addrAr = watch('address.ar'); const addrEn = watch('address.en');

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'تعديل المستشفى' : 'إضافة مستشفى'} size="lg">
      <form onSubmit={handleSubmit((d) => mut.mutate(d))} className="space-y-5">
        <FormField label="الاسم" required>
          <BilingualInput arValue={nameAr} enValue={nameEn}
            onArChange={(v) => setValue('name.ar', v)} onEnChange={(v) => setValue('name.en', v)}
            placeholder={{ ar: 'اسم المستشفى بالعربي', en: 'Hospital name in English' }} />
        </FormField>

        <FormField label="الوصف">
          <BilingualInput arValue={descAr} enValue={descEn}
            onArChange={(v) => setValue('description.ar', v)} onEnChange={(v) => setValue('description.en', v)}
            multiline rows={3} placeholder={{ ar: 'وصف مختصر...', en: 'Short description...' }} />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="المدينة">
            <BilingualInput arValue={cityAr} enValue={cityEn}
              onArChange={(v) => setValue('city.ar', v)} onEnChange={(v) => setValue('city.en', v)}
              placeholder={{ ar: 'المدينة', en: 'City' }} />
          </FormField>
          <FormField label="العنوان">
            <BilingualInput arValue={addrAr} enValue={addrEn}
              onArChange={(v) => setValue('address.ar', v)} onEnChange={(v) => setValue('address.en', v)}
              placeholder={{ ar: 'العنوان', en: 'Address' }} />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="الهاتف">
            <input {...register('phone')} type="tel" dir="ltr" className={inputCls} placeholder="+966..." />
          </FormField>
          <FormField label="البريد الإلكتروني">
            <input {...register('email')} type="email" dir="ltr" className={inputCls} placeholder="info@hospital.com" />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="الموقع الإلكتروني">
            <input {...register('website')} type="url" dir="ltr" className={inputCls} placeholder="https://..." />
          </FormField>
          <FormField label="العلامة التجارية">
            <select {...register('brandId')} className={selectCls}>
              <option value="">— اختر —</option>
              {brands?.data.map((b: any) => <option key={b.id} value={b.id}>{b.name?.ar || b.code}</option>)}
            </select>
          </FormField>
        </div>

        <FormField label="رابط خريطة جوجل (تضمين Embed URL)">
          <input {...register('googleMapsUrl')} type="url" dir="ltr" className={inputCls} placeholder="https://www.google.com/maps/embed?pb=..." />
        </FormField>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-xl border border-gray-200 hover:bg-gray-50 transition">إلغاء</button>
          <button type="submit" disabled={mut.isPending} className="px-5 py-2 text-sm rounded-xl bg-[#0B1F3A] text-white hover:bg-[#0E7C86] transition disabled:opacity-50">
            {mut.isPending ? 'جاري الحفظ...' : (editing ? 'حفظ التعديلات' : 'إضافة')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
