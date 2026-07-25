'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/admin/ui/Toast';
import Modal from '@/components/admin/ui/Modal';
import FormField from '@/components/admin/ui/FormField';
import BilingualInput from '@/components/admin/ui/BilingualInput';

interface Props { open: boolean; onClose: () => void; editing: any; onSaved: () => void; }

export default function NewsCategoryModal({ open, onClose, editing, onSaved }: Props) {
  const { toast } = useToast();
  const { handleSubmit, reset, setValue, watch } = useForm<any>({
    defaultValues: { name: { ar: '', en: '' } },
  });

  useEffect(() => {
    reset(editing ? { name: editing.name ?? { ar: '', en: '' } } : { name: { ar: '', en: '' } });
  }, [editing, reset]);

  const mut = useMutation({
    mutationFn: (data: any) => editing ? api.news.updateCategory(editing.id, data) : api.news.createCategory(data),
    onSuccess: () => { toast('success', editing ? 'تم التحديث' : 'تم الإضافة'); onSaved(); },
    onError: (e: any) => toast('error', e.message),
  });

  const n = { ar: watch('name.ar'), en: watch('name.en') };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'تعديل التصنيف' : 'إضافة تصنيف'} size="sm">
      <form onSubmit={handleSubmit((d) => mut.mutate(d))} className="space-y-5">
        <FormField label="اسم التصنيف" required>
          <BilingualInput arValue={n.ar} enValue={n.en} onArChange={(v) => setValue('name.ar', v)} onEnChange={(v) => setValue('name.en', v)} placeholder={{ ar: 'اسم التصنيف', en: 'Category name' }} />
        </FormField>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-xl border border-gray-200 hover:bg-gray-50 transition">إلغاء</button>
          <button type="submit" disabled={mut.isPending} className="px-5 py-2 text-sm rounded-xl bg-[#0B1F3A] text-white hover:bg-[#0E7C86] transition disabled:opacity-50">
            {mut.isPending ? 'جاري الحفظ...' : (editing ? 'حفظ' : 'إضافة')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
