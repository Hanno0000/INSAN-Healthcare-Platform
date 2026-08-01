'use client';

import { useState, useEffect } from 'react';
import type { Hospital, MedicalCenter, Doctor, Clinic } from '@/lib/public-api';
import { getBookingQuestions } from '@/lib/public-api';
import { t } from '@/lib/utils';
import { ChevronLeft, CheckCircle2, Loader2 } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1';

interface Props {
  hospitals: Hospital[];
  centers: MedicalCenter[];
  doctors: Doctor[];
  clinics: (Clinic & { hospitalId?: string; medicalCenterId?: string; hospital?: any; medicalCenter?: any })[];
  defaultHospitalId?: string;
  defaultCenterId?: string;
  defaultClinicId?: string;
  defaultDoctorId?: string;
}

type Step = 'info' | 'questions' | 'done';

export default function AppointmentForm({
  hospitals, centers, doctors, clinics,
  defaultHospitalId, defaultCenterId, defaultClinicId, defaultDoctorId
}: Props) {
  const [step, setStep] = useState<Step>('info');
  const [appointmentId, setAppointmentId] = useState<string | null>(null);

  // Step 1 form data
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    hospitalId: defaultHospitalId || '',
    medicalCenterId: defaultCenterId || '',
    clinicId: defaultClinicId || '',
    doctorId: defaultDoctorId || '',
    preferredDate: '',
    message: '',
  });

  // Step 2 — dynamic questions
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [questionsLoading, setQuestionsLoading] = useState(false);

  // Submitting state
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  // Fetch questions when medical center changes
  useEffect(() => {
    if (form.medicalCenterId) {
      setQuestionsLoading(true);
      getBookingQuestions(form.medicalCenterId)
        .then((res) => {
          if (res?.data && res.data.length > 0) {
            setQuestions(res.data);
            const initialAnswers: Record<string, any> = {};
            res.data.forEach((q: any) => {
              if (q.questionType === 'checkbox') initialAnswers[q.id] = [];
              else initialAnswers[q.id] = '';
            });
            setAnswers(initialAnswers);
          } else {
            setQuestions([]);
            setAnswers({});
          }
        })
        .catch(console.error)
        .finally(() => setQuestionsLoading(false));
    } else {
      setQuestions([]);
      setAnswers({});
    }
  }, [form.medicalCenterId]);

  function onChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm(prev => {
      const nextForm = { ...prev, [name]: value };
      
      if (name === 'clinicId' && value) {
        const clinic = clinics.find(c => c.id === value);
        if (clinic) {
          if (clinic.hospitalId || clinic.hospital?.id) {
            nextForm.hospitalId = clinic.hospitalId || clinic.hospital?.id;
          }
          if (clinic.medicalCenterId || clinic.medicalCenter?.id) {
            nextForm.medicalCenterId = clinic.medicalCenterId || clinic.medicalCenter?.id;
          } else {
            nextForm.medicalCenterId = ''; // clear if standalone clinic
          }
        }
      }

      if (name === 'doctorId' && value) {
        const doc = doctors.find(d => d.id === value);
        if (doc) {
          const hArr = (doc as any).hospitals || [];
          if (hArr.length > 0 && !nextForm.hospitalId) {
            nextForm.hospitalId = hArr[0].hospital?.id || hArr[0].id || nextForm.hospitalId;
          }
          const cArr = (doc as any).centers || doc.medicalCenters || [];
          if (cArr.length > 0 && !nextForm.medicalCenterId) {
            nextForm.medicalCenterId = cArr[0].medicalCenter?.id || cArr[0].id || nextForm.medicalCenterId;
          }
        }
      }
      
      return nextForm;
    });
  }

  function onAnswerChange(qId: string, val: any) {
    setAnswers(prev => ({ ...prev, [qId]: val }));
  }

  // Step 1 submit — send core appointment data, then optionally go to step 2
  async function onSubmitStep1(e: React.FormEvent) {
    e.preventDefault();
    setErrMsg('');
    setSubmitting(true);
    try {
      const body: Record<string, any> = { name: form.name, phone: form.phone };
      if (form.email) body.email = form.email;
      if (form.hospitalId) body.hospitalId = form.hospitalId;
      if (form.medicalCenterId) body.medicalCenterId = form.medicalCenterId;
      if (form.clinicId) body.clinicId = form.clinicId;
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

      const data = await res.json();
      setAppointmentId(data?.data?.id || null);

      // If there are custom questions, go to step 2 — otherwise done
      if (questions.length > 0) {
        setStep('questions');
      } else {
        setStep('done');
      }
    } catch (err: any) {
      setErrMsg(err.message || 'حدث خطأ، يرجى المحاولة مجدداً');
    } finally {
      setSubmitting(false);
    }
  }

  // Step 2 submit — send answers and complete
  async function onSubmitStep2(e: React.FormEvent) {
    e.preventDefault();
    setErrMsg('');
    setSubmitting(true);
    try {
      if (appointmentId && Object.keys(answers).length > 0) {
        await fetch(`${API_BASE}/appointments/${appointmentId}/answers`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers }),
        });
      }
      setStep('done');
    } catch {
      // Non-critical — go to done anyway, answers are bonus info
      setStep('done');
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = 'w-full bg-light-bg border border-gray-100 rounded-xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/40 focus:border-accent-500 transition-colors text-heading placeholder-gray-400 font-cairo shadow-sm';
  const selectCls = `${inputCls} cursor-pointer appearance-none`;

  // ─── Step indicator ──────────────────────────────────────────────────────────
  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-3 mb-8">
      <div className={`flex items-center gap-2 ${step === 'info' ? 'text-accent-500 font-bold' : 'text-green-500'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${step === 'info' ? 'border-accent-500 bg-accent-500 text-white' : 'border-green-400 bg-green-50 text-green-600'}`}>
          {step !== 'info' ? '✓' : '1'}
        </div>
        <span className="text-sm hidden sm:inline">بياناتك</span>
      </div>
      <div className={`h-px w-12 ${step === 'info' ? 'bg-gray-200' : 'bg-green-300'}`} />
      <div className={`flex items-center gap-2 ${step === 'questions' ? 'text-accent-500 font-bold' : step === 'done' ? 'text-green-500' : 'text-gray-400'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${step === 'questions' ? 'border-accent-500 bg-accent-500 text-white' : step === 'done' ? 'border-green-400 bg-green-50 text-green-600' : 'border-gray-200 bg-gray-50'}`}>
          {step === 'done' ? '✓' : '2'}
        </div>
        <span className="text-sm hidden sm:inline">أسئلة التخصيص</span>
      </div>
    </div>
  );

  // ─── Done screen ─────────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="bg-white rounded-card border border-gray-100 p-12 text-center shadow-sm">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </div>
        <h3 className="text-2xl font-bold text-heading font-montserrat mb-3">تم استقبال طلب الحجز بنجاح</h3>
        <p className="text-default font-cairo text-lg leading-relaxed">
          شكراً لثقتك بنا. سيتواصل معك فريقنا قريباً لتأكيد الموعد وإرشادك للخطوات التالية.
        </p>
      </div>
    );
  }

  // ─── Step 2: Custom Questions ─────────────────────────────────────────────────
  if (step === 'questions') {
    return (
      <div>
        <StepIndicator />
        <div className="text-center mb-8">
          <h2 className="text-xl md:text-2xl font-bold text-heading font-montserrat mb-2">معلومات إضافية للمركز</h2>
          <p className="text-default font-cairo text-sm">
            يرجى الإجابة على الأسئلة التالية لمساعدتنا في تحضير زيارتك بشكل أفضل
          </p>
        </div>

        <form onSubmit={onSubmitStep2} className="space-y-6">
          {questions.map((q: any) => (
            <div key={q.id}>
              <label className="block text-sm font-bold text-heading font-cairo mb-2">
                {t(q.questionText)} {q.isRequired && <span className="text-red-500">*</span>}
              </label>

              {q.questionType === 'text' && (
                <input
                  type="text"
                  required={q.isRequired}
                  value={answers[q.id] || ''}
                  onChange={(e) => onAnswerChange(q.id, e.target.value)}
                  className={inputCls}
                />
              )}

              {q.questionType === 'textarea' && (
                <textarea
                  required={q.isRequired}
                  value={answers[q.id] || ''}
                  onChange={(e) => onAnswerChange(q.id, e.target.value)}
                  rows={3}
                  className={`${inputCls} resize-none`}
                />
              )}

              {q.questionType === 'select' && (
                <select
                  required={q.isRequired}
                  value={answers[q.id] || ''}
                  onChange={(e) => onAnswerChange(q.id, e.target.value)}
                  className={selectCls}
                >
                  <option value="">اختر إجابة</option>
                  {q.options?.map((opt: any, i: number) => (
                    <option key={i} value={opt.value}>{t(opt.label)}</option>
                  ))}
                </select>
              )}

              {q.questionType === 'radio' && (
                <div className="space-y-2">
                  {q.options?.map((opt: any, i: number) => (
                    <label key={i} className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-gray-100 hover:border-accent-400 hover:bg-accent-50/30 transition">
                      <input
                        type="radio"
                        name={`question_${q.id}`}
                        value={opt.value}
                        required={q.isRequired}
                        checked={answers[q.id] === opt.value}
                        onChange={(e) => onAnswerChange(q.id, e.target.value)}
                        className="w-4 h-4 text-accent-500 border-gray-300 focus:ring-accent-500"
                      />
                      <span className="text-sm font-cairo text-heading">{t(opt.label)}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.questionType === 'checkbox' && (
                <div className="space-y-2">
                  {q.options?.map((opt: any, i: number) => (
                    <label key={i} className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-gray-100 hover:border-accent-400 hover:bg-accent-50/30 transition">
                      <input
                        type="checkbox"
                        value={opt.value}
                        checked={(answers[q.id] || []).includes(opt.value)}
                        onChange={(e) => {
                          const val = e.target.value;
                          const current = answers[q.id] || [];
                          if (e.target.checked) {
                            onAnswerChange(q.id, [...current, val]);
                          } else {
                            onAnswerChange(q.id, current.filter((v: string) => v !== val));
                          }
                        }}
                        className="w-4 h-4 rounded text-accent-500 border-gray-300 focus:ring-accent-500"
                      />
                      <span className="text-sm font-cairo text-heading">{t(opt.label)}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}

          {errMsg && <p className="text-red-600 text-sm bg-red-50 px-4 py-3 rounded-xl">{errMsg}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep('done')}
              className="px-6 py-3 rounded-pill border border-gray-200 text-gray-600 hover:bg-gray-50 font-cairo transition text-sm"
            >
              تخطي هذه الخطوة
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-accent-500 hover:bg-accent-600 disabled:opacity-60 text-white font-bold py-4 rounded-pill transition-all font-cairo text-lg shadow-card-hover flex items-center justify-center gap-2"
            >
              {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> جاري الإرسال...</> : <>إرسال والإنهاء <ChevronLeft className="w-5 h-5" /></>}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ─── Step 1: Basic Info ───────────────────────────────────────────────────────
  return (
    <div>
      {questions.length > 0 && <StepIndicator />}

      <form onSubmit={onSubmitStep1} className="space-y-6">
        {/* Name + Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-heading font-cairo mb-2">الاسم الكامل <span className="text-red-500">*</span></label>
            <input required name="name" value={form.name} onChange={onChange} placeholder="أدخل اسمك الكامل" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-bold text-heading font-cairo mb-2">رقم الهاتف <span className="text-red-500">*</span></label>
            <input required name="phone" value={form.phone} onChange={onChange} placeholder="01xxxxxxxxx" className={inputCls} />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-bold text-heading font-cairo mb-2">البريد الإلكتروني</label>
          <input type="email" name="email" value={form.email} onChange={onChange} placeholder="example@email.com" className={inputCls} />
        </div>

        {/* Clinic */}
        {clinics && clinics.length > 0 && (
          <div>
            <label className="block text-sm font-bold text-heading font-cairo mb-2">العيادة <span className="text-red-500">*</span></label>
            <select required name="clinicId" value={form.clinicId} onChange={onChange} className={selectCls}>
              <option value="">اختر العيادة</option>
              {clinics.map(c => <option key={c.id} value={c.id}>{t(c.name)}</option>)}
            </select>
          </div>
        )}

        {/* Hospital */}
        {hospitals.length > 0 && (
          <div>
            <label className="block text-sm font-bold text-heading font-cairo mb-2">المستشفى</label>
            <select name="hospitalId" value={form.hospitalId} onChange={onChange} className={selectCls} disabled={!!form.clinicId}>
              <option value="">اختر المستشفى (اختياري)</option>
              {hospitals.map(h => <option key={h.id} value={h.id}>{t(h.name)}</option>)}
            </select>
          </div>
        )}

        {/* Medical Center */}
        {centers.length > 0 && form.medicalCenterId && (
          <div>
            <label className="block text-sm font-bold text-heading font-cairo mb-2">المركز الطبي</label>
            <select name="medicalCenterId" value={form.medicalCenterId} onChange={onChange} className={selectCls} disabled={!!form.clinicId}>
              <option value="">اختر المركز الطبي (اختياري)</option>
              {centers.map(c => <option key={c.id} value={c.id}>{t(c.name)}</option>)}
            </select>
            {questionsLoading && (
              <p className="text-xs text-accent-500 mt-1 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> جاري تحميل أسئلة المركز...
              </p>
            )}
            {!questionsLoading && form.medicalCenterId && questions.length > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                ✓ سيتم عرض {questions.length} سؤال تخصيصي في الخطوة التالية
              </p>
            )}
          </div>
        )}

        {/* Doctor */}
        {doctors.length > 0 && (
          <div>
            <label className="block text-sm font-bold text-heading font-cairo mb-2">الطبيب</label>
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
          <label className="block text-sm font-bold text-heading font-cairo mb-2">التاريخ المفضل</label>
          <input
            type="date" name="preferredDate" value={form.preferredDate} onChange={onChange}
            min={new Date().toISOString().split('T')[0]}
            className={inputCls}
          />
        </div>

        {/* Message */}
        <div>
          <label className="block text-sm font-bold text-heading font-cairo mb-2">ملاحظات إضافية</label>
          <textarea
            name="message" value={form.message} onChange={onChange}
            placeholder="أي معلومات إضافية تود مشاركتها..."
            rows={3}
            className={`${inputCls} resize-none`}
          />
        </div>

        {errMsg && <p className="text-red-600 text-sm bg-red-50 px-4 py-3 rounded-xl">{errMsg}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-accent-500 hover:bg-accent-600 disabled:opacity-60 text-white font-bold py-4 rounded-pill transition-all font-cairo text-lg shadow-card-hover mt-4 flex items-center justify-center gap-2"
        >
          {submitting
            ? <><Loader2 className="w-5 h-5 animate-spin" /> جاري الإرسال...</>
            : questions.length > 0
              ? <>التالي — أسئلة التخصيص <ChevronLeft className="w-5 h-5" /></>
              : 'تأكيد طلب الحجز'
          }
        </button>

        <p className="text-sm text-gray-400 text-center font-cairo mt-4">
          سيتواصل معك فريقنا خلال 24 ساعة لتأكيد موعدك
        </p>
      </form>
    </div>
  );
}
