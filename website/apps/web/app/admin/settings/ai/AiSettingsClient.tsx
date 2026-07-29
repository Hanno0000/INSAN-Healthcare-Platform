'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/admin/ui/Toast';
import PageHeader from '@/components/admin/ui/PageHeader';
import FormField, { inputCls } from '@/components/admin/ui/FormField';
import Modal from '@/components/admin/ui/Modal';
import { Bot, Plus, Trash2, Edit2, Play, Activity, AlertCircle, Save, Loader2, BookOpen } from 'lucide-react';
import ConfirmDialog from '@/components/admin/ui/ConfirmDialog';

export default function AiSettingsClient() {
  const qc = useQueryClient();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'providers' | 'knowledge'>('providers');
  
  // =====================
  // Providers State
  // =====================
  const { data: providers, isLoading: isLoadingProviders } = useQuery({
    queryKey: ['ai-providers'],
    queryFn: () => api.aiProviders.list(),
  });
  const [editingProvider, setEditingProvider] = useState<any>(null);
  const [deleteProviderId, setDeleteProviderId] = useState<string | null>(null);

  const delProviderMut = useMutation({
    mutationFn: (id: string) => api.aiProviders.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ai-providers'] }); toast('success', 'تم الحذف بنجاح'); setDeleteProviderId(null); },
    onError: (e: any) => toast('error', e.message),
  });

  // =====================
  // Knowledge Base State
  // =====================
  const { data: knowledgeBase, isLoading: isLoadingKb } = useQuery({
    queryKey: ['ai-knowledge'],
    queryFn: () => api.aiKnowledgeBase.list(),
  });
  const [editingKb, setEditingKb] = useState<any>(null);
  const [deleteKbId, setDeleteKbId] = useState<string | null>(null);

  const delKbMut = useMutation({
    mutationFn: (id: string) => api.aiKnowledgeBase.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ai-knowledge'] }); toast('success', 'تم الحذف بنجاح'); setDeleteKbId(null); },
    onError: (e: any) => toast('error', e.message),
  });

  return (
    <div>
      <PageHeader 
        title="إعدادات الذكاء الاصطناعي" 
        subtitle="إدارة نماذج الذكاء الاصطناعي والقاعدة المعرفية"
        action={activeTab === 'providers' ? "إضافة نموذج" : "إضافة معلومة"}
        onAction={() => activeTab === 'providers' ? setEditingProvider({}) : setEditingKb({})}
      />

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 mt-6 mb-6">
        <button 
          onClick={() => setActiveTab('providers')}
          className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'providers' ? 'border-[#0E7C86] text-[#0E7C86]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          نماذج الذكاء الاصطناعي
        </button>
        <button 
          onClick={() => setActiveTab('knowledge')}
          className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'knowledge' ? 'border-[#0E7C86] text-[#0E7C86]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          القاعدة المعرفية
        </button>
      </div>

      {activeTab === 'providers' && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {isLoadingProviders ? (
            <div className="p-8 text-center text-gray-500">جاري التحميل...</div>
          ) : !providers?.data || providers.data.length === 0 ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center">
              <Bot size={48} className="text-gray-300 mb-4" />
              <p className="font-semibold text-gray-700">لا يوجد أي نماذج ذكاء اصطناعي</p>
              <p className="text-sm mt-2">اضغط على زر إضافة نموذج بالأعلى للبدء</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-gray-50 text-gray-600 border-b border-gray-100">
                  <tr>
                    <th className="p-4 font-semibold">النموذج (Provider)</th>
                    <th className="p-4 font-semibold">اسم الموديل</th>
                    <th className="p-4 font-semibold">API Key</th>
                    <th className="p-4 font-semibold">الحالة</th>
                    <th className="p-4 font-semibold w-32">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {providers.data.map((p: any) => (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition">
                      <td className="p-4 font-medium text-gray-800 flex items-center gap-2">
                        <Bot size={16} className="text-[#0E7C86]" />
                        {p.name}
                      </td>
                      <td className="p-4 font-mono text-xs text-gray-600">{p.modelName}</td>
                      <td className="p-4 font-mono text-xs text-gray-400">{p.maskedApiKey || '••••'}</td>
                      <td className="p-4">
                        {p.isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                            <Activity size={12} /> نشط
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            <AlertCircle size={12} /> معطل
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setEditingProvider(p)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"><Edit2 size={16} /></button>
                          <button onClick={() => setDeleteProviderId(p.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'knowledge' && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {isLoadingKb ? (
            <div className="p-8 text-center text-gray-500">جاري التحميل...</div>
          ) : !knowledgeBase?.data || knowledgeBase.data.length === 0 ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center">
              <BookOpen size={48} className="text-gray-300 mb-4" />
              <p className="font-semibold text-gray-700">لا يوجد بيانات في القاعدة المعرفية</p>
              <p className="text-sm mt-2">اضغط على زر إضافة معلومة بالأعلى لتغذية المساعد الذكي</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-gray-50 text-gray-600 border-b border-gray-100">
                  <tr>
                    <th className="p-4 font-semibold">السؤال / الموضوع</th>
                    <th className="p-4 font-semibold">الإجابة</th>
                    <th className="p-4 font-semibold">القسم</th>
                    <th className="p-4 font-semibold">الحالة</th>
                    <th className="p-4 font-semibold w-32">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {knowledgeBase.data.map((k: any) => (
                    <tr key={k.id} className="hover:bg-gray-50/50 transition">
                      <td className="p-4 font-medium text-gray-800 max-w-[200px] truncate" title={k.question?.ar}>
                        {k.question?.ar || k.topic?.ar || '---'}
                      </td>
                      <td className="p-4 text-gray-600 max-w-[300px] truncate" title={k.answer?.ar}>
                        {k.answer?.ar}
                      </td>
                      <td className="p-4 text-gray-600">{k.category || 'عام'}</td>
                      <td className="p-4">
                        {k.isActive ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800">نشط</span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-800">معطل</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setEditingKb(k)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"><Edit2 size={16} /></button>
                          <button onClick={() => setDeleteKbId(k.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Delete Modals */}
      <ConfirmDialog 
        open={!!deleteProviderId} 
        onClose={() => setDeleteProviderId(null)} 
        onConfirm={() => delProviderMut.mutate(deleteProviderId!)} 
        loading={delProviderMut.isPending} 
        message="هل تريد بالتأكيد حذف هذا النموذج؟" 
      />

      <ConfirmDialog 
        open={!!deleteKbId} 
        onClose={() => setDeleteKbId(null)} 
        onConfirm={() => delKbMut.mutate(deleteKbId!)} 
        loading={delKbMut.isPending} 
        message="هل تريد بالتأكيد حذف هذا السجل من القاعدة المعرفية؟" 
      />

      {/* Edit Modals */}
      {editingProvider && (
        <ProviderEditor 
          initial={Object.keys(editingProvider).length > 0 ? editingProvider : null} 
          onClose={() => setEditingProvider(null)} 
        />
      )}

      {editingKb && (
        <KnowledgeBaseEditor
          initial={Object.keys(editingKb).length > 0 ? editingKb : null}
          onClose={() => setEditingKb(null)}
        />
      )}
    </div>
  );
}

function ProviderEditor({ initial, onClose }: { initial: any; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    id: initial?.id || '',
    name: initial?.name || '',
    baseUrl: initial?.baseUrl || '',
    apiKey: '', // Always start empty for security, unless testing
    modelName: initial?.modelName || '',
    priority: initial?.priority || 0,
    isActive: initial?.isActive ?? true,
  });

  const [testResult, setTestResult] = useState<{success?: boolean, msg?: string, loading: boolean}>({ loading: false });

  const saveMut = useMutation({
    mutationFn: (data: any) => api.aiProviders.save(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ai-providers'] }); toast('success', 'تم الحفظ بنجاح'); onClose(); },
    onError: (e: any) => toast('error', e.message),
  });

  const testMut = useMutation({
    mutationFn: (data: any) => api.aiProviders.test(data),
    onMutate: () => setTestResult({ loading: true }),
    onSuccess: (res) => {
      setTestResult({ loading: false, success: true, msg: 'الاتصال ناجح: ' + res.data.text });
      toast('success', 'تم التحقق من الاتصال بنجاح');
    },
    onError: (e: any) => {
      setTestResult({ loading: false, success: false, msg: e.message });
      toast('error', 'فشل الاتصال: ' + e.message);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!initial && !formData.apiKey) {
      toast('error', 'يرجى إدخال مفتاح API');
      return;
    }
    saveMut.mutate(formData);
  };

  const handleTest = () => {
    if (!formData.apiKey && !initial?.id) {
      toast('error', 'يرجى إدخال مفتاح API أولاً');
      return;
    }
    if (!formData.apiKey) {
      toast('error', 'يرجى إدخال المفتاح الفعلي لاختبار الاتصال');
      return;
    }
    testMut.mutate({
      name: formData.name,
      baseUrl: formData.baseUrl,
      apiKey: formData.apiKey,
      modelName: formData.modelName
    });
  };

  return (
    <Modal open={true} onClose={onClose} title={initial ? 'تعديل النموذج' : 'إضافة نموذج ذكاء اصطناعي'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="اسم المزود (مثال: OpenAI, Gemini, Groq)" required>
          <input type="text" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} className={inputCls} required dir="ltr" />
        </FormField>
        
        <FormField label="رابط الـ API الأساسي (اختياري)">
          <input type="url" value={formData.baseUrl} onChange={e => setFormData(p => ({ ...p, baseUrl: e.target.value }))} className={inputCls} dir="ltr" placeholder="https://api.openai.com/v1/chat/completions" />
        </FormField>

        <FormField label="مفتاح الـ API (API Key)" required={!initial}>
          <input 
            type="password" 
            value={formData.apiKey} 
            onChange={e => setFormData(p => ({ ...p, apiKey: e.target.value }))} 
            className={inputCls} 
            dir="ltr" 
            placeholder={initial ? '•••••••••••••••• اترك الحقل فارغاً للاحتفاظ بالمفتاح الحالي' : 'sk-...'} 
            required={!initial}
          />
        </FormField>

        <FormField label="اسم الموديل (Model Name)" required>
          <input type="text" value={formData.modelName} onChange={e => setFormData(p => ({ ...p, modelName: e.target.value }))} className={inputCls} required dir="ltr" placeholder="gpt-4o-mini" />
        </FormField>

        <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4 mt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={formData.isActive} onChange={e => setFormData(p => ({ ...p, isActive: e.target.checked }))} className="w-5 h-5 rounded border-gray-300 text-[#0E7C86]" />
            <span className="text-sm font-medium">تفعيل النموذج</span>
          </label>
        </div>

        {/* Test Connection Area */}
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">اختبار الاتصال</p>
            <button type="button" onClick={handleTest} disabled={testMut.isPending} className="text-xs bg-white border border-gray-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-gray-50 transition disabled:opacity-50">
              {testMut.isPending ? <Loader2 size={14} className="animate-spin text-blue-600" /> : <Play size={14} className="text-blue-600" />}
              فحص
            </button>
          </div>
          {testResult.msg && (
            <div className={`p-3 text-xs rounded-lg ${testResult.success ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
              {testResult.msg}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-5 py-2 text-sm rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition">إلغاء</button>
          <button type="submit" disabled={saveMut.isPending} className="px-6 py-2 text-sm rounded-xl bg-[#0B1F3A] text-white hover:bg-[#0E7C86] transition disabled:opacity-50 flex items-center gap-2">
            <Save size={16} /> حفظ النموذج
          </button>
        </div>
      </form>
    </Modal>
  );
}

function KnowledgeBaseEditor({ initial, onClose }: { initial: any; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    id: initial?.id || '',
    topic: { ar: initial?.topic?.ar || '', en: initial?.topic?.en || '' },
    question: { ar: initial?.question?.ar || '', en: initial?.question?.en || '' },
    answer: { ar: initial?.answer?.ar || '', en: initial?.answer?.en || '' },
    category: initial?.category || 'عام',
    isActive: initial?.isActive ?? true,
  });

  const saveMut = useMutation({
    mutationFn: (data: any) => api.aiKnowledgeBase.save(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ai-knowledge'] }); toast('success', 'تم الحفظ بنجاح'); onClose(); },
    onError: (e: any) => toast('error', e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMut.mutate(formData);
  };

  return (
    <Modal open={true} onClose={onClose} title={initial ? 'تعديل المعلومة' : 'إضافة معلومة للقاعدة'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="القسم (اختياري)">
          <input type="text" value={formData.category} onChange={e => setFormData(p => ({ ...p, category: e.target.value }))} className={inputCls} placeholder="مثال: الأسعار، المواعيد" />
        </FormField>
        <FormField label="السؤال المحتمل (عربي)" required>
          <input type="text" value={formData.question.ar} onChange={e => setFormData(p => ({ ...p, question: { ...p.question, ar: e.target.value } }))} className={inputCls} required />
        </FormField>
        <FormField label="الإجابة (عربي)" required>
          <textarea rows={4} value={formData.answer.ar} onChange={e => setFormData(p => ({ ...p, answer: { ...p.answer, ar: e.target.value } }))} className={inputCls} required />
        </FormField>
        <div className="flex items-center gap-2 cursor-pointer mt-2">
          <input type="checkbox" checked={formData.isActive} onChange={e => setFormData(p => ({ ...p, isActive: e.target.checked }))} className="w-5 h-5 rounded border-gray-300 text-[#0E7C86]" id="kb-active" />
          <label htmlFor="kb-active" className="text-sm font-medium cursor-pointer">تفعيل المعلومة للمساعد الذكي</label>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-5 py-2 text-sm rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition">إلغاء</button>
          <button type="submit" disabled={saveMut.isPending} className="px-6 py-2 text-sm rounded-xl bg-[#0B1F3A] text-white hover:bg-[#0E7C86] transition disabled:opacity-50 flex items-center gap-2">
            <Save size={16} /> حفظ المعلومة
          </button>
        </div>
      </form>
    </Modal>
  );
}
