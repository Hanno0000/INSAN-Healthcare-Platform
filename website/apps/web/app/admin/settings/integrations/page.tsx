'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api-client';
import PageHeader from '@/components/admin/ui/PageHeader';
import { Save, AlertCircle, RefreshCw, Key, MessageSquare } from 'lucide-react';

interface Integration {
  id?: string;
  provider: string;
  isActive: boolean;
  maskedValue: string;
}

export default function IntegrationsSettingsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  // The state that holds the current values being edited in the form
  const [formState, setFormState] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/admin/integrations');
      const data: Integration[] = res.data || [];
      setIntegrations(data);
      
      const newFormState: Record<string, string> = {};
      data.forEach(item => {
        newFormState[item.provider] = item.maskedValue;
      });
      setFormState(newFormState);
    } catch (err: any) {
      setMessage({ type: 'error', text: 'فشل في جلب البيانات' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (provider: string, val: string) => {
    setFormState(prev => ({ ...prev, [provider]: val }));
  };

  const handleSave = async (provider: string) => {
    try {
      setSaving(true);
      setMessage(null);
      const val = formState[provider];
      
      if (!val) {
        setMessage({ type: 'error', text: 'لا يمكن حفظ قيمة فارغة' });
        return;
      }

      await apiRequest('/admin/integrations', {
        method: 'POST',
        body: JSON.stringify({
          provider,
          value: val,
          isActive: true
        })
      });
      
      setMessage({ type: 'success', text: 'تم حفظ المفتاح بنجاح' });
      await fetchIntegrations(); // Refresh to get the new masked value
    } catch (err: any) {
      setMessage({ type: 'error', text: 'حدث خطأ أثناء الحفظ' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">جاري التحميل...</div>;
  }

  const renderKeyCard = (title: string, provider: string, icon: React.ReactNode, description: string) => {
    const isMasked = formState[provider]?.startsWith('••••');
    
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary-50 text-primary-600 rounded-lg">
              {icon}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-500">{description}</p>
            </div>
          </div>
          {isMasked && (
            <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full flex items-center gap-1 font-medium">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              متصل بنجاح
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 mt-6">
          <div className="flex-1 relative">
            <input
              type="text"
              value={formState[provider] || ''}
              onChange={(e) => handleChange(provider, e.target.value)}
              placeholder="أدخل المفتاح هنا..."
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors font-mono"
              dir="ltr"
              onFocus={() => {
                // If it's currently masked, clear it on focus so they can paste a new one
                if (isMasked) {
                  handleChange(provider, '');
                }
              }}
            />
            {isMasked && (
              <div className="absolute top-1/2 right-4 -translate-y-1/2 text-xs text-gray-400">
                مشفر
              </div>
            )}
          </div>
          
          <button
            onClick={() => handleSave(provider)}
            disabled={saving || (isMasked && formState[provider] === integrations.find(i => i.provider === provider)?.maskedValue)}
            className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isMasked ? 'تغيير المفتاح' : 'حفظ'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          لن يتم عرض هذا المفتاح أبداً لأسباب أمنية. لتغييره، قم بلصق المفتاح الجديد واضغط حفظ.
        </p>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader
        title="إدارة المفاتيح والربط (Integrations)"
        subtitle="مركز إدارة المفاتيح الحساسة للذكاء الاصطناعي وفيسبوك"
      />

      {message && (
        <div className={`p-4 rounded-lg mb-6 flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          <AlertCircle className="w-5 h-5" />
          <span>{message.text}</span>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-6 text-sm text-blue-800">
        <h4 className="font-bold flex items-center gap-2 mb-2"><AlertCircle size={16} /> دليل ربط صفحة الفيسبوك</h4>
        <p className="mb-2">لسحب الأخبار والمنشورات من صفحة الفيسبوك الخاصة بالمستشفى تلقائياً وإضافتها للموقع، اتبع الخطوات التالية:</p>
        <ol className="list-decimal list-inside space-y-1.5 marker:text-blue-600 marker:font-bold">
          <li>قم بتسجيل الدخول إلى حساب المطورين <strong>Meta for Developers</strong>.</li>
          <li>قم بإنشاء تطبيق جديد (App) واختر نوعه (Business).</li>
          <li>من إعدادات التطبيق، قم بتوليد <strong>Page Access Token</strong> (مفتاح الوصول) مع صلاحيات <code>pages_read_engagement</code> و <code>pages_manage_posts</code>.</li>
          <li>انسخ رمز الصفحة (Page ID) من إعدادات صفحتك العامة وضعها في الحقل الأول.</li>
          <li>انسخ مفتاح الوصول (Access Token) الذي قمت بتوليده وضعه في الحقل الثاني.</li>
        </ol>
      </div>

      {renderKeyCard(
        'Facebook Page ID',
        'FACEBOOK_PAGE_ID',
        <Key className="w-6 h-6" />,
        'رقم معرف صفحة الفيسبوك الخاصة بك لسحب الأخبار.'
      )}

      {renderKeyCard(
        'Facebook Access Token',
        'FACEBOOK_ACCESS_TOKEN',
        <Key className="w-6 h-6" />,
        'توكن الوصول طويل الأمد من فيسبوك.'
      )}

      {renderKeyCard(
        'أيام انتظار النشر التلقائي للفيسبوك',
        'FACEBOOK_SYNC_AUTO_PUBLISH_DAYS',
        <RefreshCw className="w-6 h-6" />,
        'عدد الأيام (مثلاً 3) التي ينتظرها النظام قبل نشر البوست المعلق من فيسبوك. اتركها فارغة لإيقاف النشر التلقائي.'
      )}

      {renderKeyCard(
        'OpenAI API Key',
        'OPENAI_API_KEY',
        <MessageSquare className="w-6 h-6" />,
        'مفتاح الذكاء الاصطناعي لتشغيل المساعد الذكي.'
      )}
      
      {renderKeyCard(
        'Claude API Key',
        'CLAUDE_API_KEY',
        <MessageSquare className="w-6 h-6" />,
        'مفتاح الذكاء الاصطناعي (اختياري، في حال استخدامه بديلاً عن OpenAI).'
      )}
    </div>
  );
}
