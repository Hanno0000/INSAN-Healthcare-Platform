'use client';

import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/admin/ui/Toast';
import Modal from '@/components/admin/ui/Modal';
import FormField, { inputCls, textareaCls, selectCls } from '@/components/admin/ui/FormField';
import BilingualInput from '@/components/admin/ui/BilingualInput';
import ImageUpload from '@/components/admin/ui/ImageUpload';
import { Plus, Trash2 } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  editing: any;
  onSaved: () => void;
}

const ICON_OPTIONS = [
  { value: 'search', label: 'بحث (search)' },
  { value: 'calendar', label: 'تقويم (calendar)' },
  { value: 'stethoscope', label: 'سماعة طبيب (stethoscope)' },
  { value: 'smile', label: 'ابتسامة (smile)' },
  { value: 'heart', label: 'قلب (heart)' },
  { value: 'shield', label: 'درع (shield)' },
  { value: 'users', label: 'أشخاص (users)' },
  { value: 'activity', label: 'نبض (activity)' },
];

const EMPTY_BILINGUAL = { ar: '', en: '' };

const DEFAULT_HERO_STATS = [
  { value: '', suffix: '', label: { ...EMPTY_BILINGUAL } },
  { value: '', suffix: '', label: { ...EMPTY_BILINGUAL } },
  { value: '', suffix: '', label: { ...EMPTY_BILINGUAL } },
];

const DEFAULT_JOURNEY_STEPS = [
  { icon: 'search', image: '', title: { ...EMPTY_BILINGUAL }, desc: { ...EMPTY_BILINGUAL } },
  { icon: 'calendar', image: '', title: { ...EMPTY_BILINGUAL }, desc: { ...EMPTY_BILINGUAL } },
  { icon: 'stethoscope', image: '', title: { ...EMPTY_BILINGUAL }, desc: { ...EMPTY_BILINGUAL } },
  { icon: 'smile', image: '', title: { ...EMPTY_BILINGUAL }, desc: { ...EMPTY_BILINGUAL } },
];

const DEFAULT_VALUES = {
  slug: '',
  name: { ...EMPTY_BILINGUAL },
  shortDescription: { ...EMPTY_BILINGUAL },
  description: { ...EMPTY_BILINGUAL },
  logoUrl: '',
  heroImage: '',
  brandColor: '',
  status: 'DRAFT',
  heroTagline: { ...EMPTY_BILINGUAL },
  heroStats: DEFAULT_HERO_STATS.map((s) => ({ ...s, label: { ...s.label } })),
  departments: [] as any[],
  journeySteps: DEFAULT_JOURNEY_STEPS.map((s) => ({ ...s, title: { ...s.title }, desc: { ...s.desc } })),
  contactInfo: { phone: '', email: '', address: { ...EMPTY_BILINGUAL } },
  googleMapsUrl: '',
  locations: [] as any[],
};

/** يحذف الحقول الفارغة قبل الإرسال حتى لا يفشل تحقّق الـ API (hex/regex) على قيم فارغة */
function clean(obj: any): any {
  if (Array.isArray(obj)) {
    return obj
      .map(clean)
      .filter((v: any) => {
        if (v === null || v === undefined || v === '') return false;
        if (Array.isArray(v)) return v.length > 0;
        if (typeof v === 'object' && Object.keys(v).length === 0) return false;
        return true;
      });
  }
  if (obj && typeof obj === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v === '' || v === undefined || v === null) continue;
      if (typeof v === 'object') {
        const cleaned = clean(v);
        if (Array.isArray(cleaned) && cleaned.length === 0) continue;
        if (!Array.isArray(cleaned) && typeof cleaned === 'object' && Object.keys(cleaned).length === 0) continue;
        out[k] = cleaned;
      } else {
        out[k] = v;
      }
    }
    return out;
  }
  return obj;
}

export default function HospitalModal({ open, onClose, editing, onSaved }: Props) {
  const { toast } = useToast();
  const [tab, setTab] = useState<'basic' | 'hero' | 'departments' | 'journey' | 'contact'>('basic');

  const { register, handleSubmit, reset, setValue, watch, control } = useForm<any>({
    defaultValues: DEFAULT_VALUES,
  });

  const { fields: deptFields, append: appendDept, remove: removeDept } = useFieldArray({ control, name: 'departments' });
  const { fields: locFields, append: appendLoc, remove: removeLoc } = useFieldArray({ control, name: 'locations' });

  const { data: doctorsRes } = useQuery({
    queryKey: ['doctors-list-for-departments'],
    queryFn: () => api.doctors.list({ pageSize: 200 }),
    enabled: open,
  });
  const doctors = doctorsRes?.data ?? [];

  useEffect(() => {
    if (!open) return;
    setTab('basic');
    if (editing) {
      reset({
        ...DEFAULT_VALUES,
        ...editing,
        name: editing.name ?? { ...EMPTY_BILINGUAL },
        shortDescription: editing.shortDescription ?? { ...EMPTY_BILINGUAL },
        description: editing.description ?? { ...EMPTY_BILINGUAL },
        heroTagline: editing.heroTagline ?? { ...EMPTY_BILINGUAL },
        heroStats: editing.heroStats?.length ? editing.heroStats : DEFAULT_VALUES.heroStats,
        departments: editing.departments ?? [],
        journeySteps: editing.journeySteps?.length === 4 ? editing.journeySteps : DEFAULT_VALUES.journeySteps,
        contactInfo: {
          phone: editing.contactInfo?.phone ?? '',
          email: editing.contactInfo?.email ?? '',
          address: editing.contactInfo?.address ?? { ...EMPTY_BILINGUAL },
        },
        locations: editing.locations ?? [],
      });
    } else {
      reset(DEFAULT_VALUES);
    }
  }, [editing, open, reset]);

  const mut = useMutation({
    mutationFn: (data: any) => editing ? api.hospitals.update(editing.id, data) : api.hospitals.create(data),
    onSuccess: () => { toast('success', editing ? 'تم تحديث المستشفى' : 'تم إضافة المستشفى'); onSaved(); },
    onError: (e: any) => toast('error', e.message),
  });

  const onSubmit = (d: any) => {
    // heroStats و journeySteps صفوف ثابتة — أرسلها كاملة بلا فلترة عناصر فارغة داخل المصفوفة نفسها
    const payload = clean({ ...d });
    if (Array.isArray(d.heroStats) && d.heroStats.some((s: any) => s.value)) payload.heroStats = d.heroStats;
    if (Array.isArray(d.journeySteps)) payload.journeySteps = d.journeySteps;
    
    const rawDepts = (d.departments?.length ? d.departments : editing?.departments) || [];
    payload.departments = rawDepts.filter((dept: any) => {
      return dept && (dept.slug?.trim() || dept.name?.ar?.trim() || dept.name?.en?.trim());
    });

    const rawLocs = (d.locations?.length ? d.locations : editing?.locations) || [];
    payload.locations = rawLocs.filter((loc: any) => loc && (loc.name?.ar?.trim() || loc.name?.en?.trim()));

    // التحقق المسبق (Client-Side Validation) للأقسام
    for (let i = 0; i < payload.departments.length; i++) {
      const slug = payload.departments[i].slug?.trim();
      payload.departments[i].slug = slug;
      if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
        toast('error', `القسم رقم ${i + 1}: المعرّف (slug) غير صحيح. استخدم حروف إنجليزية وأرقام وشرطات فقط بدون مسافات.`);
        setTab('departments');
        return;
      }
      if (!payload.departments[i].name?.ar?.trim()) {
        toast('error', `القسم رقم ${i + 1}: الاسم بالعربي مطلوب.`);
        setTab('departments');
        return;
      }
    }

    // التحقق المسبق للمواقع
    for (let i = 0; i < payload.locations.length; i++) {
      const url = payload.locations[i].mapsUrl;
      if (url && !/^https:\/\/(www\.)?google\.com\/maps\/embed/.test(url)) {
        toast('error', `الموقع رقم ${i + 1}: رابط خريطة جوجل غير صحيح. تأكد من استخدام رابط (Embed) يبدأ بـ https://www.google.com/maps/embed`);
        setTab('contact');
        return;
      }
    }

    mut.mutate(payload);
  };

  const nameAr = watch('name.ar'); const nameEn = watch('name.en');
  const shortDescAr = watch('shortDescription.ar'); const shortDescEn = watch('shortDescription.en');
  const descAr = watch('description.ar'); const descEn = watch('description.en');
  const taglineAr = watch('heroTagline.ar'); const taglineEn = watch('heroTagline.en');
  const addrAr = watch('contactInfo.address.ar'); const addrEn = watch('contactInfo.address.en');
  const logoUrl = watch('logoUrl');
  const heroImage = watch('heroImage');

  const TABS: { key: typeof tab; label: string }[] = [
    { key: 'basic', label: 'الأساسية' },
    { key: 'hero', label: 'Hero' },
    { key: 'departments', label: 'الأقسام' },
    { key: 'journey', label: 'رحلة المريض' },
    { key: 'contact', label: 'التواصل والمواقع' },
  ];

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'تعديل المستشفى' : 'إضافة مستشفى'} size="xl">
      <div className="mb-4 rounded-xl bg-blue-50 border border-blue-100 px-4 py-2 text-xs text-blue-700">
        التغييرات على الموقع العام تظهر خلال دقيقة واحدة تقريباً.
      </div>

      <div className="flex flex-wrap gap-1 mb-5 bg-gray-100 rounded-xl p-1">
        {TABS.map((tb) => (
          <button
            key={tb.key}
            type="button"
            onClick={() => setTab(tb.key)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${tab === tb.key ? 'bg-white shadow-sm text-[#0B1F3A]' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* ── الأساسية ── */}
        <div className={tab === 'basic' ? 'space-y-5' : 'hidden'}>
          <FormField label="المعرّف (slug)" required hint="حروف إنجليزية صغيرة وأرقام وشرطات فقط — يظهر في رابط الصفحة">
            <input {...register('slug')} className={inputCls} dir="ltr" placeholder="delta-hospital" />
          </FormField>

          <FormField label="الاسم" required>
            <BilingualInput arValue={nameAr} enValue={nameEn}
              onArChange={(v) => setValue('name.ar', v)} onEnChange={(v) => setValue('name.en', v)}
              placeholder={{ ar: 'اسم المستشفى بالعربي', en: 'Hospital name in English' }} />
          </FormField>

          <FormField label="وصف مختصر">
            <BilingualInput arValue={shortDescAr} enValue={shortDescEn}
              onArChange={(v) => setValue('shortDescription.ar', v)} onEnChange={(v) => setValue('shortDescription.en', v)}
              placeholder={{ ar: 'وصف مختصر...', en: 'Short description...' }} />
          </FormField>

          <FormField label="الوصف الكامل">
            <BilingualInput arValue={descAr} enValue={descEn}
              onArChange={(v) => setValue('description.ar', v)} onEnChange={(v) => setValue('description.en', v)}
              multiline rows={4} placeholder={{ ar: 'وصف كامل...', en: 'Full description...' }} />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <ImageUpload label="رابط الشعار (Logo URL)" value={logoUrl || ''} onChange={(url) => setValue('logoUrl', url)} />
            <ImageUpload label="صورة الغلاف (Hero Image)" value={heroImage || ''} onChange={(url) => setValue('heroImage', url)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="اللون المميز (hex)" hint="مثال: #175CDD">
              <input {...register('brandColor')} type="text" dir="ltr" className={inputCls} placeholder="#175CDD" />
            </FormField>
            <FormField label="الحالة">
              <select {...register('status')} className={selectCls}>
                <option value="DRAFT">مسودة</option>
                <option value="PUBLISHED">منشور</option>
                <option value="ARCHIVED">مؤرشف</option>
              </select>
            </FormField>
          </div>
        </div>

        {/* ── Hero ── */}
        <div className={tab === 'hero' ? 'space-y-5' : 'hidden'}>
          <FormField label="الجملة التعريفية (Hero Tagline)">
            <BilingualInput arValue={taglineAr} enValue={taglineEn}
              onArChange={(v) => setValue('heroTagline.ar', v)} onEnChange={(v) => setValue('heroTagline.en', v)}
              placeholder={{ ar: 'رعاية متكاملة بمعايير عالمية', en: 'Integrated care, global standards' }} />
          </FormField>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">الإحصائيات الثلاثة</p>
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-start bg-gray-50 border border-gray-100 rounded-xl p-3">
                  <input {...register(`heroStats.${i}.value`)} className={`${inputCls} col-span-3`} dir="ltr" placeholder="15" />
                  <input {...register(`heroStats.${i}.suffix`)} className={`${inputCls} col-span-2`} dir="ltr" placeholder="+" />
                  <div className="col-span-7">
                    <BilingualInput
                      arValue={watch(`heroStats.${i}.label.ar`)} enValue={watch(`heroStats.${i}.label.en`)}
                      onArChange={(v) => setValue(`heroStats.${i}.label.ar`, v)} onEnChange={(v) => setValue(`heroStats.${i}.label.en`, v)}
                      placeholder={{ ar: 'سنة خبرة', en: 'Years' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── الأقسام ── */}
        <div className={tab === 'departments' ? 'space-y-4' : 'hidden'}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">أقسام المستشفى</p>
            <button
              type="button"
              onClick={() => appendDept({ slug: '', name: { ...EMPTY_BILINGUAL }, shortDescription: { ...EMPTY_BILINGUAL }, description: { ...EMPTY_BILINGUAL }, image: '', doctorIds: [] })}
              className="text-xs font-bold text-[#0E7C86] flex items-center gap-1 hover:underline"
            >
              <Plus size={14} /> إضافة قسم
            </button>
          </div>

          {deptFields.length === 0 && <p className="text-xs text-gray-400 text-center py-4">لا توجد أقسام مضافة</p>}

          <div className="space-y-4">
            {deptFields.map((f, i) => {
              const selectedDoctorIds: string[] = watch(`departments.${i}.doctorIds`) || [];
              return (
                <div key={f.id} className="border border-gray-200 rounded-xl p-4 space-y-3 bg-white">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-400">قسم #{i + 1}</span>
                    <button type="button" onClick={() => removeDept(i)} className="text-red-500 p-1.5 hover:bg-red-50 rounded-lg">
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <FormField label="المعرّف (slug)" required hint="فريد داخل هذا المستشفى — حروف إنجليزية وأرقام وشرطات">
                    <input {...register(`departments.${i}.slug`)} className={inputCls} dir="ltr" placeholder="cardiology" />
                  </FormField>

                  <FormField label="اسم القسم" required>
                    <BilingualInput
                      arValue={watch(`departments.${i}.name.ar`)} enValue={watch(`departments.${i}.name.en`)}
                      onArChange={(v) => setValue(`departments.${i}.name.ar`, v)} onEnChange={(v) => setValue(`departments.${i}.name.en`, v)}
                      placeholder={{ ar: 'قسم القلب', en: 'Cardiology' }} />
                  </FormField>

                  <FormField label="وصف مختصر (للكارت)">
                    <BilingualInput
                      arValue={watch(`departments.${i}.shortDescription.ar`)} enValue={watch(`departments.${i}.shortDescription.en`)}
                      onArChange={(v) => setValue(`departments.${i}.shortDescription.ar`, v)} onEnChange={(v) => setValue(`departments.${i}.shortDescription.en`, v)}
                      placeholder={{ ar: 'وصف مختصر...', en: 'Short description...' }} />
                  </FormField>

                  <FormField label="وصف كامل (لصفحة القسم)">
                    <BilingualInput
                      arValue={watch(`departments.${i}.description.ar`)} enValue={watch(`departments.${i}.description.en`)}
                      onArChange={(v) => setValue(`departments.${i}.description.ar`, v)} onEnChange={(v) => setValue(`departments.${i}.description.en`, v)}
                      multiline rows={3} placeholder={{ ar: 'وصف كامل...', en: 'Full description...' }} />
                  </FormField>

                  <ImageUpload label="رابط صورة القسم" value={watch(`departments.${i}.image`) || ''} onChange={(url) => setValue(`departments.${i}.image`, url)} />

                  <FormField label="أطباء القسم">
                    <div className="max-h-40 overflow-y-auto border border-gray-100 rounded-xl p-2 space-y-1 bg-gray-50">
                      {doctors.length === 0 && <p className="text-xs text-gray-400 px-2 py-1">لا يوجد أطباء</p>}
                      {doctors.map((doc: any) => (
                        <label key={doc.id} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white cursor-pointer text-sm">
                          <input
                            type="checkbox"
                            checked={selectedDoctorIds.includes(doc.id)}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...selectedDoctorIds, doc.id]
                                : selectedDoctorIds.filter((id) => id !== doc.id);
                              setValue(`departments.${i}.doctorIds`, next);
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-[#0E7C86]"
                          />
                          <span>{doc.name?.ar || doc.name?.en || doc.slug}</span>
                        </label>
                      ))}
                    </div>
                  </FormField>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── رحلة المريض ── */}
        <div className={tab === 'journey' ? 'space-y-4' : 'hidden'}>
          <p className="text-sm font-medium text-gray-700">4 خطوات رحلة المريض — اتركها فارغة لعرض الخطوات الافتراضية</p>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-3 bg-white">
              <span className="text-xs font-bold text-gray-400">خطوة #{i + 1}</span>
              <div className="grid grid-cols-2 gap-4">
                <ImageUpload label="صورة الخطوة (اختياري)" value={watch(`journeySteps.${i}.image`) || ''} onChange={(url) => setValue(`journeySteps.${i}.image`, url)} />
                <FormField label="الأيقونة الاحتياطية">
                  <select {...register(`journeySteps.${i}.icon`)} className={selectCls}>
                    {ICON_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </FormField>
              </div>
              <FormField label="العنوان">
                <BilingualInput
                  arValue={watch(`journeySteps.${i}.title.ar`)} enValue={watch(`journeySteps.${i}.title.en`)}
                  onArChange={(v) => setValue(`journeySteps.${i}.title.ar`, v)} onEnChange={(v) => setValue(`journeySteps.${i}.title.en`, v)}
                  placeholder={{ ar: 'ابحث عن طبيبك', en: 'Find your doctor' }} />
              </FormField>
              <FormField label="الوصف">
                <BilingualInput
                  arValue={watch(`journeySteps.${i}.desc.ar`)} enValue={watch(`journeySteps.${i}.desc.en`)}
                  onArChange={(v) => setValue(`journeySteps.${i}.desc.ar`, v)} onEnChange={(v) => setValue(`journeySteps.${i}.desc.en`, v)}
                  multiline rows={2} placeholder={{ ar: 'وصف مختصر للخطوة...', en: 'Short step description...' }} />
              </FormField>
            </div>
          ))}
        </div>

        {/* ── التواصل والمواقع ── */}
        <div className={tab === 'contact' ? 'space-y-5' : 'hidden'}>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="الهاتف">
              <input {...register('contactInfo.phone')} type="tel" dir="ltr" className={inputCls} placeholder="+20..." />
            </FormField>
            <FormField label="البريد الإلكتروني">
              <input {...register('contactInfo.email')} type="email" dir="ltr" className={inputCls} placeholder="info@hospital.com" />
            </FormField>
          </div>

          <FormField label="العنوان">
            <BilingualInput arValue={addrAr} enValue={addrEn}
              onArChange={(v) => setValue('contactInfo.address.ar', v)} onEnChange={(v) => setValue('contactInfo.address.en', v)}
              placeholder={{ ar: 'العنوان بالعربي', en: 'Address in English' }} />
          </FormField>

          <FormField label="رابط خريطة جوجل الرئيسية (Embed URL)" hint="يجب أن يبدأ بـ https://www.google.com/maps/embed">
            <input {...register('googleMapsUrl')} type="url" dir="ltr" className={inputCls} placeholder="https://www.google.com/maps/embed?pb=..." />
          </FormField>

          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">مواقع إضافية (فروع / عيادات)</p>
            <button
              type="button"
              onClick={() => appendLoc({ name: { ...EMPTY_BILINGUAL }, mapsUrl: '' })}
              className="text-xs font-bold text-[#0E7C86] flex items-center gap-1 hover:underline"
            >
              <Plus size={14} /> إضافة موقع
            </button>
          </div>

          {locFields.length === 0 && <p className="text-xs text-gray-400 text-center py-2">لا توجد مواقع إضافية</p>}

          <div className="space-y-3">
            {locFields.map((f, i) => (
              <div key={f.id} className="border border-gray-200 rounded-xl p-3 space-y-3 bg-white">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-400">موقع #{i + 1}</span>
                  <button type="button" onClick={() => removeLoc(i)} className="text-red-500 p-1.5 hover:bg-red-50 rounded-lg">
                    <Trash2 size={14} />
                  </button>
                </div>
                <FormField label="اسم الموقع">
                  <BilingualInput
                    arValue={watch(`locations.${i}.name.ar`)} enValue={watch(`locations.${i}.name.en`)}
                    onArChange={(v) => setValue(`locations.${i}.name.ar`, v)} onEnChange={(v) => setValue(`locations.${i}.name.en`, v)}
                    placeholder={{ ar: 'الفرع الرئيسي', en: 'Main Branch' }} />
                </FormField>
                <FormField label="رابط خريطة جوجل (Embed URL)" hint="يجب أن يبدأ بـ https://www.google.com/maps/embed">
                  <input {...register(`locations.${i}.mapsUrl`)} type="url" dir="ltr" className={inputCls} placeholder="https://www.google.com/maps/embed?pb=..." />
                </FormField>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 mt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-xl border border-gray-200 hover:bg-gray-50 transition">إلغاء</button>
          <button type="submit" disabled={mut.isPending} className="px-5 py-2 text-sm rounded-xl bg-[#0B1F3A] text-white hover:bg-[#0E7C86] transition disabled:opacity-50">
            {mut.isPending ? 'جاري الحفظ...' : (editing ? 'حفظ التعديلات' : 'إضافة')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
