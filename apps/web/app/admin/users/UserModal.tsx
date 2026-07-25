'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/admin/ui/Toast';
import Modal from '@/components/admin/ui/Modal';
import FormField, { inputCls, selectCls } from '@/components/admin/ui/FormField';

interface Props { open: boolean; onClose: () => void; editing: any; onSaved: () => void; }

export default function UserModal({ open, onClose, editing, onSaved }: Props) {
  const { toast } = useToast();
  const { register, handleSubmit, reset } = useForm<any>({
    defaultValues: { name: '', email: '', password: '', roleId: '', isActive: true },
  });

  const { data: roles } = useQuery({ queryKey: ['roles'], queryFn: () => api.users.listRoles() });

  useEffect(() => {
    reset(editing ? {
      name: editing.name ?? '',
      email: editing.email ?? '',
      password: '',
      roleId: editing.roleId ?? editing.role?.id ?? '',
      isActive: editing.isActive ?? true,
    } : { name: '', email: '', password: '', roleId: '', isActive: true });
  }, [editing, reset]);

  const mut = useMutation({
    mutationFn: (data: any) => {
      const body = { ...data };
      if (!body.password) delete body.password;
      if (editing) return api.users.update(editing.id, body);
      return api.users.create(body);
    },
    onSuccess: () => { toast('success', editing ? 'تم التحديث' : 'تم إضافة المستخدم'); onSaved(); },
    onError: (e: any) => toast('error', e.message),
  });

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'تعديل المستخدم' : 'إضافة مستخدم'} size="md">
      <form onSubmit={handleSubmit((d) => mut.mutate(d))} className="space-y-5">
        <FormField label="الاسم" required>
          <input {...register('name', { required: true })} dir="rtl" className={inputCls} placeholder="الاسم الكامل" />
        </FormField>
        <FormField label="البريد الإلكتروني" required>
          <input {...register('email', { required: true })} type="email" dir="ltr" className={inputCls} placeholder="email@example.com" />
        </FormField>
        <FormField label={editing ? 'كلمة المرور الجديدة (اتركها فارغة للإبقاء عليها)' : 'كلمة المرور'} required={!editing}>
          <input {...register('password')} type="password" dir="ltr" className={inputCls} placeholder="••••••••" />
        </FormField>
        <FormField label="الدور" required>
          <select {...register('roleId', { required: true })} className={selectCls}>
            <option value="">— اختر الدور —</option>
            {roles?.data.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </FormField>
        <FormField label="الحالة">
          <label className="flex items-center gap-2 cursor-pointer">
            <input {...register('isActive')} type="checkbox" defaultChecked className="w-4 h-4 rounded" />
            <span className="text-sm text-gray-600">مستخدم نشط</span>
          </label>
        </FormField>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-xl border border-gray-200 hover:bg-gray-50 transition">إلغاء</button>
          <button type="submit" disabled={mut.isPending} className="px-5 py-2 text-sm rounded-xl bg-[#0B1F3A] text-white hover:bg-[#0E7C86] transition disabled:opacity-50">
            {mut.isPending ? 'جاري الحفظ...' : (editing ? 'حفظ' : 'إضافة')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
