'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/admin/ui/Toast';
import PageHeader from '@/components/admin/ui/PageHeader';
import { inputCls } from '@/components/admin/ui/FormField';
import { Save, ToggleLeft, ToggleRight, Bot } from 'lucide-react';

const GROUPS = [
  { key: 'general', label: 'عام' },
  { key: 'contact', label: 'التواصل' },
  { key: 'social', label: 'التواصل الاجتماعي' },
  { key: 'seo', label: 'SEO' },
  { key: 'appearance', label: 'المظهر' },
];

function SettingRow({ setting, onSave }: { setting: any; onSave: (key: string, value: any) => void }) {
  const [val, setVal] = useState(
    typeof setting.value === 'object' ? JSON.stringify(setting.value, null, 2) : String(setting.value ?? '')
  );
  const [dirty, setDirty] = useState(false);

  const handleChange = (v: string) => { setVal(v); setDirty(true); };
  const handleSave = () => {
    let parsed: any = val;
    try { parsed = JSON.parse(val); } catch { /* keep as string */ }
    onSave(setting.key, parsed);
    setDirty(false);
  };

  return (
    <div className="flex items-start gap-4 py-4 border-b border-gray-50 last:border-0">
      <div className="w-48 shrink-0">
        <p className="text-sm font-medium text-gray-700">{setting.label?.ar || setting.key}</p>
        <p className="text-xs text-gray-400 font-mono mt-0.5">{setting.key}</p>
      </div>
      <div className="flex-1">
        {setting.isSensitive ? (
          <p className="text-xs text-gray-400 italic">قيمة حساسة — لا تُعرض</p>
        ) : (
          <textarea
            value={val}
            onChange={(e) => handleChange(e.target.value)}
            rows={typeof setting.value === 'object' ? 3 : 1}
            dir="auto"
            className={`${inputCls} resize-none`}
          />
        )}
      </div>
      {!setting.isSensitive && (
        <button
          onClick={handleSave}
          disabled={!dirty}
          className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg bg-[#0B1F3A] text-white hover:bg-[#0E7C86] transition disabled:opacity-30 shrink-0"
        >
          <Save size={12} /> حفظ
        </button>
      )}
    </div>
  );
}

function FeatureFlagRow({ flag, onToggle }: { flag: any; onToggle: (key: string, enabled: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-700">{flag.label?.ar || flag.key}</p>
        <p className="text-xs text-gray-400 font-mono">{flag.key}</p>
      </div>
      <button onClick={() => onToggle(flag.key, !flag.isEnabled)} className="transition">
        {flag.isEnabled
          ? <ToggleRight size={28} className="text-emerald-500" />
          : <ToggleLeft size={28} className="text-gray-300" />}
      </button>
    </div>
  );
}

export default function SettingsClient() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [group, setGroup] = useState('general');

  const { data: settings, isLoading: loadingSettings } = useQuery({
    queryKey: ['settings', group],
    queryFn: () => api.settings.list({ group }),
  });

  const { data: flags, isLoading: loadingFlags } = useQuery({
    queryKey: ['feature-flags'],
    queryFn: () => api.settings.listFlags(),
  });

  const updateMut = useMutation({
    mutationFn: ({ key, value }: any) => api.settings.update(key, value),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings'] }); toast('success', 'تم الحفظ'); },
    onError: (e: any) => toast('error', e.message),
  });

  const flagMut = useMutation({
    mutationFn: ({ key, isEnabled }: any) => api.settings.toggleFlag(key, isEnabled),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['feature-flags'] }); toast('success', 'تم التحديث'); },
    onError: (e: any) => toast('error', e.message),
  });

  return (
    <div>
      <PageHeader title="الإعدادات" subtitle="إعدادات الموقع والعلامة التجارية" />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar tabs */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-100 p-2">
            {GROUPS.map((g) => (
              <button key={g.key} onClick={() => setGroup(g.key)}
                className={`w-full text-right px-3 py-2 rounded-xl text-sm transition mb-0.5 ${group === g.key ? 'bg-[#0B1F3A] text-white font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                {g.label}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-2 mt-4">
             <a href="/admin/settings/ai" className="block w-full text-right px-3 py-2 rounded-xl text-sm transition text-gray-600 hover:bg-gray-50 flex items-center justify-between">
               <span className="font-semibold text-[#0E7C86]">الذكاء الاصطناعي (AI)</span>
               <Bot size={16} className="text-[#0E7C86]" />
             </a>
          </div>

          {/* Feature Flags */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 mt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">ميزات النظام</h3>
            {loadingFlags ? <div className="h-20 bg-gray-50 rounded-xl animate-pulse" /> :
              flags?.data.map((f: any) => (
                <FeatureFlagRow key={f.key} flag={f} onToggle={(key, enabled) => flagMut.mutate({ key, isEnabled: enabled })} />
              ))}
          </div>
        </div>

        {/* Settings list */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            {GROUPS.find(g => g.key === group)?.label}
          </h2>
          {loadingSettings ? (
            <div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />)}</div>
          ) : !settings?.data?.length ? (
            <p className="text-sm text-gray-400 text-center py-8">لا توجد إعدادات في هذا القسم</p>
          ) : (
            settings.data.map((s: any) => (
              <SettingRow key={s.key} setting={s} onSave={(key, value) => updateMut.mutate({ key, value })} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
