'use client';

import { useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1';

export default function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState('');

  function onChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch(`${API_BASE}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error?.message || 'حدث خطأ أثناء الإرسال');
      }
      setStatus('success');
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (err: any) {
      setErrMsg(err.message || 'حدث خطأ، يرجى المحاولة مجدداً');
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h3 className="text-xl font-bold text-primary-900 mb-2">تم إرسال رسالتك بنجاح</h3>
        <p className="text-gray-500">سيتواصل معك فريقنا في أقرب وقت ممكن.</p>
        <button
          onClick={() => setStatus('idle')}
          className="mt-6 text-secondary-500 hover:underline text-sm font-medium"
        >
          إرسال رسالة أخرى
        </button>
      </div>
    );
  }

  const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-secondary-500/40 focus:border-secondary-500 transition-colors bg-white';

  return (
    <form onSubmit={onSubmit} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
      <h2 className="text-lg font-bold text-primary-900 mb-2">أرسل رسالتك</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            الاسم الكامل <span className="text-red-500">*</span>
          </label>
          <input required name="name" value={form.name} onChange={onChange} placeholder="أدخل اسمك" className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">رقم الهاتف</label>
          <input name="phone" value={form.phone} onChange={onChange} placeholder="05xxxxxxxx" className={inputCls} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">البريد الإلكتروني</label>
        <input type="email" name="email" value={form.email} onChange={onChange} placeholder="example@email.com" className={inputCls} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">الموضوع</label>
        <input name="subject" value={form.subject} onChange={onChange} placeholder="موضوع رسالتك" className={inputCls} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          الرسالة <span className="text-red-500">*</span>
        </label>
        <textarea
          required name="message" value={form.message} onChange={onChange}
          placeholder="اكتب رسالتك هنا..."
          rows={5}
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
        {status === 'loading' ? 'جارٍ الإرسال...' : 'إرسال الرسالة'}
      </button>
    </form>
  );
}
