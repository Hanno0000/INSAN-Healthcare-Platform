'use client';

import { useState } from 'react';
import { Loader2, Star } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1';

export default function DoctorReviewForm({ doctorId }: { doctorId: string }) {
  const [phone, setPhone] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) {
      setErrMsg('الرجاء إدخال رقم الهاتف');
      return;
    }

    setStatus('loading');
    setErrMsg('');

    try {
      const res = await fetch(`${API_BASE}/doctors/${doctorId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, rating, comment }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error?.message || 'حدث خطأ. تأكد من أنك قمت بزيارة الطبيب مسبقاً.');
      }

      setStatus('success');
    } catch (err: any) {
      setStatus('error');
      setErrMsg(err.message || 'حدث خطأ غير معروف.');
    }
  };

  if (status === 'success') {
    return (
      <div className="bg-green-50 p-6 rounded-2xl border border-green-100 text-center">
        <h3 className="text-xl font-bold text-green-700 mb-2">تم إرسال التقييم بنجاح!</h3>
        <p className="text-green-600">شكراً لمشاركتك رأيك معنا. سيتم مراجعة التقييم قريباً.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mt-8">
      <h3 className="text-xl font-bold text-primary-900 mb-4">قيم تجربتك مع الطبيب</h3>
      <p className="text-sm text-gray-500 mb-6">يمكنك تقييم الطبيب فقط إذا كان لديك حجز مسبق مكتمل برقم هاتفك.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-heading font-cairo mb-2">رقم الهاتف (الذي حجزت به)</label>
          <input 
            type="text" 
            value={phone} 
            onChange={(e) => setPhone(e.target.value)} 
            placeholder="01xxxxxxxxx" 
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-secondary-500/50"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-heading font-cairo mb-2">التقييم</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                type="button"
                key={star}
                onClick={() => setRating(star)}
                className={`transition-colors ${star <= rating ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-500`}
              >
                <Star className="w-8 h-8 fill-current" />
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-heading font-cairo mb-2">تعليق (اختياري)</label>
          <textarea 
            value={comment} 
            onChange={(e) => setComment(e.target.value)} 
            placeholder="اكتب تجربتك هنا..." 
            rows={3}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-secondary-500/50 resize-none"
          />
        </div>

        {status === 'error' && (
          <p className="text-red-500 text-sm bg-red-50 p-3 rounded-xl">{errMsg}</p>
        )}

        <button 
          type="submit" 
          disabled={status === 'loading'}
          className="bg-secondary-500 hover:bg-secondary-600 text-white font-bold py-3 px-6 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {status === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />}
          إرسال التقييم
        </button>
      </form>
    </div>
  );
}
