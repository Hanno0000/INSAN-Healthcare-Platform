'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/admin/ui/Toast';
import Modal from '@/components/admin/ui/Modal';
import FormField, { inputCls } from '@/components/admin/ui/FormField';
import BilingualInput from '@/components/admin/ui/BilingualInput';

interface Props { open: boolean; onClose: () => void; editing: any; onSaved: () => void; }

const DEFAULT_VALUES = {
  topic: { ar: '', en: '' },
  question: { ar: '', en: '' },
  answer: { ar: '', en: '' },
  order: 0,
};

export default function FaqModal({ open, onClose, editing, onSaved }: Props) {
  const { toast } = useToast();
  const { register, handleSubmit, reset, setValue, watch } = useForm<any>({
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    reset(editing ? {
      topic: editing.topic ?? { ar: '', en: '' },
      question: editing.question ?? { ar: '', en: '' },
      answer: editing.answer ?? { ar: '', en: '' },
      order: editing.order ?? 0,
    } : DEFAULT_VALUES);
  }, [editing, reset]);

  const mut = useMutation({
    mutationFn: (data: any) => editing ? api.faqs.update(editing.id, data) : api.faqs.create(data),
    onSuccess: () => { toast('success', editing ? 'تم التحديث' : 'تم الإضافة'); onSaved(); },
    onError: (e: any) => toast('error', e.message),
  });

  const f = (k: string) => ({ ar: watch(`${k}.ar`), en: watch(`${k}.en`) });

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'تعديل السؤال' : 'إضافة سؤال'} size="lg">
      <form onSubmit={handleSubmit((d) => mut.mutate({ ...d, order: Number(d.order) || 0 }))} className="space-y-5">
        <FormField label="الموضوع" required hint="عنوان المجموعة اللي هيتحط تحتها السؤال في الصفحة، مثال: الحجز والمواعيد">
          <BilingualInput arValue={f('topic').ar} enValue={f('topic').en} onArChange={(v) => setValue('topic.ar', v)} onEnChange={(v) => setValue('topic.en', v)} placeholder={{ ar: 'الحجز والمواعيد', en: 'Booking & appointments' }} />
        </FormField>
        <FormField label="السؤال" required>
          <BilingualInput arValue={f('question').ar} enValue={f('question').en} onArChange={(v) => setValue('question.ar', v)} onEnChange={(v) => setValue('question.en', v)} placeholder={{ ar: 'كيف أحجز موعد؟', en: 'How do I book an appointment?' }} />
        </FormField>
        <FormField label="الإجابة" required>
          <BilingualInput arValue={f('answer').ar} enValue={f('answer').en} onArChange={(v) => setValue('answer.ar', v)} onEnChange={(v) => setValue('answer.en', v)} multiline rows={4} placeholder={{ ar: 'نص الإجابة...', en: 'Answer text...' }} />
        </FormField>
        <FormField label="الترتيب" hint="الأرقام الأصغر تظهر أولاً">
          <input {...register('order')} type="number" dir="ltr" className={inputCls} placeholder="0" />
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
