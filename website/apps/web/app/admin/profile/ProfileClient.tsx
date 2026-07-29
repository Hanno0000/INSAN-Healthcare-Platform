'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/admin/ui/Toast';
import { useAdminUser } from '@/lib/admin-context';
import PageHeader from '@/components/admin/ui/PageHeader';
import FormField, { inputCls } from '@/components/admin/ui/FormField';
import { UserCircle, KeyRound, Loader2 } from 'lucide-react';

export default function ProfileClient() {
  const { user } = useAdminUser();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<'info' | 'password'>('info');

  const { register: regInfo, handleSubmit: handleSubmitInfo, formState: { isSubmitting: isSubmittingInfo } } = useForm({
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
    },
  });

  const { register: regPwd, handleSubmit: handleSubmitPwd, reset: resetPwd, formState: { isSubmitting: isSubmittingPwd, errors: pwdErrors } } = useForm({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    }
  });

  const infoMut = useMutation({
    mutationFn: (data: any) => api.auth.updateProfile(data),
    onSuccess: () => {
      toast('success', 'تم تحديث البيانات بنجاح');
      qc.invalidateQueries({ queryKey: ['admin-user'] }); // To trigger a re-fetch of 'me' endpoint
    },
    onError: (e: any) => toast('error', e.message),
  });

  const pwdMut = useMutation({
    mutationFn: (data: any) => api.auth.updateProfile({ currentPassword: data.currentPassword, newPassword: data.newPassword }),
    onSuccess: () => {
      toast('success', 'تم تغيير كلمة المرور بنجاح');
      resetPwd();
    },
    onError: (e: any) => toast('error', e.message),
  });

  const onInfoSubmit = (data: any) => infoMut.mutate(data);
  const onPwdSubmit = (data: any) => {
    if (data.newPassword !== data.confirmPassword) {
      toast('error', 'كلمة المرور الجديدة غير متطابقة');
      return;
    }
    pwdMut.mutate(data);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader title="حسابي" subtitle="إدارة بياناتك الشخصية وكلمة المرور" />

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'info' ? 'text-[#0E7C86] border-b-2 border-[#0E7C86] bg-[#0E7C86]/5' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <UserCircle size={18} /> البيانات الأساسية
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'password' ? 'text-[#0E7C86] border-b-2 border-[#0E7C86] bg-[#0E7C86]/5' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <KeyRound size={18} /> تغيير كلمة المرور
          </button>
        </div>

        <div className="p-8">
          {activeTab === 'info' && (
            <form onSubmit={handleSubmitInfo(onInfoSubmit)} className="max-w-md mx-auto space-y-6">
              <div className="flex justify-center mb-6">
                <div className="w-24 h-24 rounded-full bg-[#0B1F3A] flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                  {(user?.name || user?.email || 'A').charAt(0).toUpperCase()}
                </div>
              </div>

              <FormField label="الاسم الكامل" required>
                <input {...regInfo('name', { required: true })} className={inputCls} placeholder="أدخل اسمك" />
              </FormField>

              <FormField label="البريد الإلكتروني" required>
                <input type="email" {...regInfo('email', { required: true })} className={inputCls} placeholder="example@email.com" dir="ltr" />
              </FormField>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={infoMut.isPending}
                  className="w-full py-3 bg-[#0B1F3A] hover:bg-[#0E7C86] text-white rounded-xl font-bold transition flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {infoMut.isPending && <Loader2 size={18} className="animate-spin" />}
                  حفظ البيانات
                </button>
              </div>
            </form>
          )}

          {activeTab === 'password' && (
            <form onSubmit={handleSubmitPwd(onPwdSubmit)} className="max-w-md mx-auto space-y-6">
              <FormField label="كلمة المرور الحالية" required>
                <input 
                  type="password" 
                  {...regPwd('currentPassword', { required: 'مطلوب' })} 
                  className={inputCls} 
                  dir="ltr" 
                />
              </FormField>

              <div className="h-px bg-gray-100 my-2" />

              <FormField label="كلمة المرور الجديدة" required>
                <input 
                  type="password" 
                  {...regPwd('newPassword', { required: 'مطلوب', minLength: { value: 8, message: 'يجب أن لا تقل عن 8 أحرف' } })} 
                  className={inputCls} 
                  dir="ltr" 
                />
                {pwdErrors.newPassword?.message && <span className="text-xs text-red-500 block mt-1">{String(pwdErrors.newPassword.message)}</span>}
              </FormField>

              <FormField label="تأكيد كلمة المرور الجديدة" required>
                <input 
                  type="password" 
                  {...regPwd('confirmPassword', { required: 'مطلوب' })} 
                  className={inputCls} 
                  dir="ltr" 
                />
              </FormField>

              <div className="pt-4 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={pwdMut.isPending}
                  className="flex-1 py-3 bg-[#0E7C86] hover:bg-[#0B1F3A] text-white rounded-xl font-bold transition flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {pwdMut.isPending && <Loader2 size={18} className="animate-spin" />}
                  تحديث كلمة المرور
                </button>
                <button
                  type="button"
                  onClick={() => resetPwd()}
                  className="px-6 py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition font-bold"
                >
                  إلغاء
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
