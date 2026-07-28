'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api-client';
import PageHeader from '@/components/admin/ui/PageHeader';
import { Save, AlertCircle } from 'lucide-react';

export default function AdminInvestorsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  const [form, setForm] = useState({
    heroTitle: '',
    htmlContent: '',
    ctaButtonText: '',
    ctaButtonLink: '',
    heroImage: '',
    videoUrl: '',
    isPublished: false
  });

  useEffect(() => {
    fetchPage();
  }, []);

  const fetchPage = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/admin/investors-page');
      if (res.data) {
        setForm({
          heroTitle: res.data.heroTitle || '',
          htmlContent: res.data.htmlContent || '',
          ctaButtonText: res.data.ctaButtonText || '',
          ctaButtonLink: res.data.ctaButtonLink || '',
          heroImage: res.data.heroImage || '',
          videoUrl: res.data.videoUrl || '',
          isPublished: res.data.isPublished || false
        });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'فشل في جلب بيانات الصفحة' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);
      await apiRequest('/admin/investors-page', { method: 'POST', body: JSON.stringify(form) });
      setMessage({ type: 'success', text: 'تم حفظ الصفحة بنجاح' });
    } catch (err: any) {
      setMessage({ type: 'error', text: 'حدث خطأ أثناء الحفظ' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setForm(prev => ({ ...prev, [name]: checked }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">جاري التحميل...</div>;
  }

  const inputCls = "w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors";

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <PageHeader 
          title="إدارة صفحة علاقات المستثمرين" 
          subtitle="تعديل المحتوى الغني (HTML) والأزرار الخاصة بصفحة المستثمرين"
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 px-6 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg mb-6 flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          <AlertCircle className="w-5 h-5" />
          <span>{message.text}</span>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-gray-900 mb-2">عنوان الصفحة (Hero Title)</label>
            <input 
              name="heroTitle" 
              value={form.heroTitle} 
              onChange={handleChange} 
              className={inputCls} 
              placeholder="مثال: علاقات المستثمرين"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">نص زر الدعوة (CTA Button Text)</label>
            <input 
              name="ctaButtonText" 
              value={form.ctaButtonText} 
              onChange={handleChange} 
              className={inputCls} 
              placeholder="مثال: تواصل معنا للشراكة"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">رابط الزر (CTA Button Link)</label>
            <input 
              name="ctaButtonLink" 
              value={form.ctaButtonLink} 
              onChange={handleChange} 
              className={inputCls} 
              dir="ltr"
              placeholder="مثال: /contact أو رابط خارجي"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">صورة الغلاف (Hero Image)</label>
            <input 
              name="heroImage" 
              value={form.heroImage || ''} 
              onChange={handleChange} 
              className={inputCls} 
              dir="ltr"
              placeholder="مثال: /images/hero.jpg"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">رابط فيديو تعريفي (Video URL - Youtube/Vimeo)</label>
            <input 
              name="videoUrl" 
              value={form.videoUrl || ''} 
              onChange={handleChange} 
              className={inputCls} 
              dir="ltr"
              placeholder="مثال: https://youtube.com/watch?v=..."
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-900 mb-2 flex items-center justify-between">
            <span>محتوى الصفحة (HTML)</span>
            <span className="text-xs text-gray-400 font-normal bg-gray-100 px-2 py-1 rounded">يتم تنقية الكود تلقائياً للحماية</span>
          </label>
          <p className="text-xs text-gray-500 mb-2">يمكنك استخدام وسوم HTML مثل &lt;h2&gt;, &lt;p&gt;, &lt;img&gt; وغيرها لتنسيق الصفحة بحرية.</p>
          <textarea 
            name="htmlContent" 
            value={form.htmlContent} 
            onChange={handleChange} 
            className={`${inputCls} font-mono text-left h-96 resize-y`}
            dir="ltr"
            placeholder="<h1>Welcome</h1><p>Investment opportunities...</p>"
          />
        </div>
        
        <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
          <input 
            type="checkbox" 
            id="isPublished" 
            name="isPublished"
            checked={form.isPublished}
            onChange={handleChange}
            className="w-5 h-5 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
          />
          <label htmlFor="isPublished" className="text-sm font-bold text-gray-900 cursor-pointer">
            نشر الصفحة (إتاحتها للجمهور)
          </label>
        </div>

      </div>
    </div>
  );
}
