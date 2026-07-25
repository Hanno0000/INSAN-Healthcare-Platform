'use client';

import { useState } from 'react';
import type { Hospital, MedicalCenter, Doctor } from '@/lib/public-api';
import { t } from '@/lib/utils';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1';

interface Props {
  hospitals: Hospital[];
  centers: MedicalCenter[];
  doctors: Doctor[];
  defaultHospitalId?: string;
  defaultCenterId?: string;
  defaultDoctorId?: string;
}

export default function AppointmentForm({ hospitals, centers, doctors, defaultHospitalId, defaultCenterId, defaultDoctorId }: Props) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    hospitalId: defaultHospitalId || '',
    medicalCenterId: defaultCenterId || '',
    doctorId: defaultDoctorId || '',
    preferredDate: '',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState('');

  function onChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    try {
      const body: Record<string, any> = { name: form.name, phone: form.phone };
      if (form.email) body.email = form.email;
      if (form.hospitalId) body.hospitalId = form.hospitalId;
      if (form.medicalCenterId) body.medicalCenterId = form.medicalCenterId;
      if (form.doctorId) body.doctorId = form.doctorId;
      if (form.preferredDate) body.preferredDate = new Date(form.preferredDate).toISOString();
      if (form.message) body.message = form.message;

      const res = await fetch(`${API_BASE}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error?.message || 'حدث خطأ أثناء الإرسال');
      }
      setStatus('success');
    } catch (err: any) {
      setErrMsg(err.message || 'حدث خطأ، يرجى المحاولة مجدداً');
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h3 className="text-xl font-bold text-primary-900 mb-2">تم استقبال طلب حجزك</h3>
        <p className="text-gray-500 leading-relaxed">
          سيتواصل معك فريقنا خلال 24 ساعة لتأكيد موعدك وإرشادك للخطوات التالية.
        </p>
      </div>
    );
  }

  const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-secondary-500/40 focus:border-secondary-500 transition-colors bg-white';
  const selectCls = `${inputCls} cursor-pointer`;

  return (
    <form onSubmit={onSubmit} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
      <h2 className="text-lg font-bold text-primary-900 mb-2">بيانات الحجز</h2>

      {/* Name + Phone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">الاسم الكامل <span className="text-red-500">*</span></label>
          <input required name="name" value={form.name} onChange={onChange} placeholder="أدخل اسمك الكامل" className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">رقم الهاتف <span className="text-red-500">*</span></label>
          <input required name="phone" value={form.phone} onChange={onChange} placeholder="01xxxxxxxxx" className={inputCls} />
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">البريد الإلكتروني</label>
        <input type="email" name="email" value={form.email} onChange={onChange} placeholder="example@email.com" className={inputCls} />
      </div>

      {/* Hospital */}
      {hospitals.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">المستشفى</label>
          <select name="hospitalId" value={form.hospitalId} onChange={onChange} className={selectCls}>
            <option value="">اختر المستشفى (اختياري)</option>
            {hospitals.map(h => <option key={h.id} value={h.id}>{t(h.name)}</option>)}
          </select>
        </div>
      )}

      {/* Medical Center */}
      {centers.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">المركز الطبي</label>
          <select name="medicalCenterId" value={form.medicalCenterId} onChange={onChange} className={selectCls}>
            <option value="">اختر المركز الطبي (اختياري)</option>
            {centers.map(c => <option key={c.id} value={c.id}>{t(c.name)}</option>)}
          </select>
        </div>
      )}

      {/* Doctor */}
      {doctors.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">الطبيب</label>
          <select name="doctorId" value={form.doctorId} onChange={onChange} className={selectCls}>
            <option value="">اختر الطبيب (اختياري)</option>
            {doctors.map(d => (
              <option key={d.id} value={d.id}>
                {t(d.name)}{d.specialty ? ` — ${t(d.specialty)}` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Preferred date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">التاريخ المفضل</label>
        <input
          type="date" name="preferredDate" value={form.preferredDate} onChange={onChange}
          min={new Date().toISOString().split('T')[0]}
          className={inputCls}
        />
      </div>

      {/* Message */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">ملاحظات إضافية</label>
        <textarea
          name="message" value={form.message} onChange={onChange}
          placeholder="أي معلومات إضافية تود مشاركتها..."
          rows={3}
          className={`${inputCls} resize-none`}
        />
      </div>

      {status === 'error' && (
        <p className="text-red-600 text-sm bg-red-50 px-4 py-3 rounded-xl">{errMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full bg-secondary-500 hover:bg-secondary-500/90 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors"
      >
        {status === 'loading' ? 'جارٍ الإرسال...' : 'تأكيد طلب الحجز'}
      </button>

      <p className="text-xs text-gray-400 text-center">
        سيتواصل معك فريقنا خلال 24 ساعة لتأكيد موعدك
      </p>
    </form>
  );
}
