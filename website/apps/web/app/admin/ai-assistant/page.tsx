'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api-client';
import PageHeader from '@/components/admin/ui/PageHeader';
import { Save, AlertCircle, Plus, Trash2, Edit2, Shield, Database } from 'lucide-react';
import Modal from '@/components/admin/ui/Modal';
import BilingualInput from '@/components/admin/ui/BilingualInput';

export default function AIAssistantPage() {
  const [activeTab, setActiveTab] = useState<'providers' | 'knowledge'>('providers');
  
  // Data
  const [providers, setProviders] = useState<any[]>([]);
  const [knowledge, setKnowledge] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isProviderModalOpen, setProviderModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<any>(null);
  
  const [isKbModalOpen, setKbModalOpen] = useState(false);
  const [editingKb, setEditingKb] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [provRes, kbRes] = await Promise.all([
        apiRequest('/ai/providers'),
        apiRequest('/ai/knowledge-base')
      ]);
      setProviders(provRes.data || []);
      setKnowledge(kbRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/ai/providers', { method: 'POST', body: JSON.stringify(editingProvider) });
      setProviderModalOpen(false);
      fetchData();
    } catch (err) {
      alert('حدث خطأ أثناء الحفظ');
    }
  };

  const handleDeleteProvider = async (id: string) => {
    if (!confirm('هل أنت متأكد من الحذف؟')) return;
    try {
      await apiRequest(`/ai/providers/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      alert('خطأ أثناء الحذف');
    }
  };

  const handleSaveKb = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/ai/knowledge-base', { method: 'POST', body: JSON.stringify(editingKb) });
      setKbModalOpen(false);
      fetchData();
    } catch (err) {
      alert('حدث خطأ أثناء الحفظ');
    }
  };

  const handleDeleteKb = async (id: string) => {
    if (!confirm('هل أنت متأكد من الحذف؟')) return;
    try {
      await apiRequest(`/ai/knowledge-base/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      alert('خطأ أثناء الحذف');
    }
  };

  const inputCls = "w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500";

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader 
        title="المساعد الذكي (AI Assistant)" 
        subtitle="إدارة مزودي خدمة الذكاء الاصطناعي (مثل Groq و Gemini) وقاعدة المعرفة"
      />

      <div className="flex border-b border-gray-200 mb-6 mt-4">
        <button
          className={`px-6 py-3 font-medium text-sm border-b-2 flex items-center gap-2 ${activeTab === 'providers' ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          onClick={() => setActiveTab('providers')}
        >
          <Shield className="w-4 h-4" /> مزودو الخدمة (Providers)
        </button>
        <button
          className={`px-6 py-3 font-medium text-sm border-b-2 flex items-center gap-2 ${activeTab === 'knowledge' ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          onClick={() => setActiveTab('knowledge')}
        >
          <Database className="w-4 h-4" /> قاعدة المعرفة (RAG)
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">جاري التحميل...</div>
      ) : activeTab === 'providers' ? (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg text-gray-800">الشركات المزودة للنماذج</h3>
            <button 
              onClick={() => { setEditingProvider({ name: '', apiKey: '', modelName: '', priority: 0, isActive: true }); setProviderModalOpen(true); }}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-primary-700"
            >
              <Plus className="w-4 h-4" /> إضافة مزود جديد
            </button>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-right text-sm">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-600">
                <tr>
                  <th className="py-3 px-4 font-semibold">الاسم (الشركة)</th>
                  <th className="py-3 px-4 font-semibold">اسم النموذج (Model)</th>
                  <th className="py-3 px-4 font-semibold">الأولوية</th>
                  <th className="py-3 px-4 font-semibold">الحالة</th>
                  <th className="py-3 px-4 font-semibold">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {providers.map(p => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="py-3 px-4 font-medium text-gray-900">{p.name}</td>
                    <td className="py-3 px-4 text-gray-600" dir="ltr">{p.modelName}</td>
                    <td className="py-3 px-4">{p.priority}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs ${p.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {p.isActive ? 'مفعل' : 'معطل'}
                      </span>
                    </td>
                    <td className="py-3 px-4 flex gap-2">
                      <button onClick={() => { setEditingProvider({ ...p, apiKey: p.maskedApiKey || '' }); setProviderModalOpen(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteProvider(p.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {providers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">لا يوجد مزودين مضافين</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg text-gray-800">الأسئلة والإجابات المرجعية</h3>
            <button 
              onClick={() => { setEditingKb({ topic: {ar: '', en: ''}, question: {ar: '', en: ''}, answer: {ar: '', en: ''}, isActive: true }); setKbModalOpen(true); }}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-primary-700"
            >
              <Plus className="w-4 h-4" /> إضافة معلومة جديدة
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {knowledge.map(k => (
              <div key={k.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col h-full">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-bold text-gray-900 text-sm">{k.question?.ar}</h4>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => { setEditingKb(k); setKbModalOpen(true); }} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDeleteKb(k.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-gray-600 text-sm line-clamp-4 flex-1 mb-3">{k.answer?.ar}</p>
                <div className="pt-3 border-t border-gray-50 mt-auto text-xs text-gray-400 flex justify-between">
                  <span>{k.topic?.ar}</span>
                  <span className={k.isActive ? 'text-green-600' : 'text-gray-400'}>{k.isActive ? 'نشط' : 'معطل'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <Modal open={isProviderModalOpen} onClose={() => setProviderModalOpen(false)} title={editingProvider?.id ? 'تعديل مزود' : 'إضافة مزود'}>
        <form onSubmit={handleSaveProvider} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1">الاسم (مثل: Groq أو Gemini)</label>
            <input required value={editingProvider?.name || ''} onChange={e => setEditingProvider({...editingProvider, name: e.target.value})} className={inputCls} dir="ltr" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1">النموذج (مثل: llama-3.3-70b-versatile أو gemini-1.5-pro)</label>
            <input required value={editingProvider?.modelName || ''} onChange={e => setEditingProvider({...editingProvider, modelName: e.target.value})} className={inputCls} dir="ltr" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1">مفتاح الـ API</label>
            <input required type="password" value={editingProvider?.apiKey || ''} onChange={e => setEditingProvider({...editingProvider, apiKey: e.target.value})} className={inputCls} dir="ltr" />
            {editingProvider?.id && (
              <p className="text-xs text-gray-400 mt-1">اتركه كما هو (••••) للإبقاء على المفتاح الحالي دون تغيير</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1">Base URL (اختياري للـ Custom Endpoints)</label>
            <input value={editingProvider?.baseUrl || ''} onChange={e => setEditingProvider({...editingProvider, baseUrl: e.target.value})} className={inputCls} dir="ltr" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">الأولوية (أقل رقم = أولاً)</label>
              <input type="number" required value={editingProvider?.priority || 0} onChange={e => setEditingProvider({...editingProvider, priority: parseInt(e.target.value)})} className={inputCls} />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={editingProvider?.isActive || false} onChange={e => setEditingProvider({...editingProvider, isActive: e.target.checked})} className="w-4 h-4" />
                <span className="text-sm font-bold">نشط (فعال)</span>
              </label>
            </div>
          </div>
          <button type="submit" className="w-full bg-primary-600 text-white font-medium py-2 rounded-lg mt-4 hover:bg-primary-700">حفظ</button>
        </form>
      </Modal>

      <Modal open={isKbModalOpen} onClose={() => setKbModalOpen(false)} title={editingKb?.id ? 'تعديل معلومة' : 'إضافة معلومة'} size="xl">
        <form onSubmit={handleSaveKb} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">السؤال الشائع أو الكلمة الدلالية</label>
            <BilingualInput 
              arValue={editingKb?.question?.ar || ''}
              enValue={editingKb?.question?.en || ''}
              onArChange={v => setEditingKb({...editingKb, question: {...editingKb.question, ar: v}})}
              onEnChange={v => setEditingKb({...editingKb, question: {...editingKb.question, en: v}})}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">الإجابة النموذجية التي يجب أن يرد بها المساعد</label>
            <BilingualInput 
              multiline
              rows={4}
              arValue={editingKb?.answer?.ar || ''}
              enValue={editingKb?.answer?.en || ''}
              onArChange={v => setEditingKb({...editingKb, answer: {...editingKb.answer, ar: v}})}
              onEnChange={v => setEditingKb({...editingKb, answer: {...editingKb.answer, en: v}})}
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={editingKb?.isActive !== false} onChange={e => setEditingKb({...editingKb, isActive: e.target.checked})} className="w-4 h-4" />
              <span className="text-sm font-bold">نشط (مفعل في البحث)</span>
            </label>
          </div>
          <p className="text-xs text-gray-400">ملاحظة: عند الحفظ سيتم تلقائياً تحويل النصوص إلى Vector Embedding ليستخدمها الذكاء الاصطناعي بدقة أثناء الإجابة.</p>
          <button type="submit" className="w-full bg-primary-600 text-white font-medium py-2.5 rounded-lg mt-2 hover:bg-primary-700">حفظ المعلومة</button>
        </form>
      </Modal>

    </div>
  );
}
