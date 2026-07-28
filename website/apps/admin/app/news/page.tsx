'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';
import PageHeader from '@/components/ui/PageHeader';
import { RefreshCw, Plus, Edit, Trash2 } from 'lucide-react';

export default function AdminNewsPage() {
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  const handleSync = async () => {
    try {
      setSyncing(true);
      setMessage(null);
      const res = await api.post('/admin/news/sync-facebook', {});
      
      if (res.data?.data?.success) {
        setMessage({ type: 'success', text: `تم مزامنة ${res.data.data.syncedCount} منشور جديد بنجاح` });
      } else {
        setMessage({ type: 'error', text: res.data?.data?.error || 'حدث خطأ أثناء المزامنة. تأكد من إعداد المفاتيح.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'فشل الاتصال بالخادم أثناء المزامنة' });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <PageHeader 
          title="إدارة الأخبار والمقالات" 
          subtitle="إضافة، تعديل وحذف الأخبار الخاصة بالمنصة"
        />
        <div className="flex items-center gap-3">
          <button 
            onClick={handleSync}
            disabled={syncing}
            className="bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium py-2 px-4 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            مزامنة فيسبوك
          </button>
          
          <button className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2 transition-colors">
            <Plus className="w-4 h-4" /> إضافة خبر جديد
          </button>
        </div>
      </div>
      
      {message && (
        <div className={`p-4 rounded-lg mb-6 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {/* Placeholder for News List Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-500">
        قائمة الأخبار سيتم عرضها هنا (التطبيق قيد الإنشاء).
      </div>
    </div>
  );
}
