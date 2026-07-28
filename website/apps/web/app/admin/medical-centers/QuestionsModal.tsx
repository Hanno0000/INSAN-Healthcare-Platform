'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/admin/ui/Toast';
import Modal from '@/components/admin/ui/Modal';
import FormField, { inputCls, selectCls } from '@/components/admin/ui/FormField';
import BilingualInput from '@/components/admin/ui/BilingualInput';
import { Plus, Trash2, Edit2, GripVertical } from 'lucide-react';
import ConfirmDialog from '@/components/admin/ui/ConfirmDialog';

interface Props { center: any; onClose: () => void; }

export default function QuestionsModal({ center, onClose }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editingQ, setEditingQ] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: questions, isLoading } = useQuery({
    queryKey: ['questions', center?.id],
    queryFn: () => api.medicalCenters.listQuestions(center!.id),
    enabled: !!center,
  });

  const delMut = useMutation({
    mutationFn: (id: string) => api.medicalCenters.deleteQuestion(center.id, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['questions', center.id] }); toast('success', 'تم الحذف'); setDeleteId(null); },
    onError: (e: any) => toast('error', e.message),
  });

  return (
    <Modal open={!!center} onClose={onClose} title={`أسئلة الحجز: ${center?.name?.ar}`} size="xl">
      {!editingQ ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setEditingQ({})} className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
              <Plus size={16} /> إضافة سؤال
            </button>
          </div>
          
          {isLoading ? (
            <p className="text-center text-gray-500 py-4">جاري التحميل...</p>
          ) : questions?.data?.length === 0 ? (
            <p className="text-center text-gray-500 py-8">لا يوجد أسئلة مضافة حتى الآن.</p>
          ) : (
            <div className="space-y-3">
              {questions?.data?.map((q: any) => (
                <div key={q.id} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-xl">
                  <div className="flex items-center gap-3">
                    <GripVertical size={16} className="text-gray-400 cursor-move" />
                    <div>
                      <p className="font-semibold text-gray-800">{q.questionText?.ar}</p>
                      <p className="text-xs text-gray-500 font-mono mt-1">النوع: {q.questionType} {q.isRequired ? '(إجباري)' : ''}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingQ(q)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                    <button onClick={() => setDeleteId(q.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => delMut.mutate(deleteId!)} loading={delMut.isPending} message="هل تريد بالتأكيد حذف هذا السؤال؟" />
        </div>
      ) : (
        <QuestionEditor centerId={center.id} initial={Object.keys(editingQ).length > 0 ? editingQ : null} onCancel={() => setEditingQ(null)} onSaved={() => { qc.invalidateQueries({ queryKey: ['questions', center.id] }); setEditingQ(null); }} />
      )}
    </Modal>
  );
}

function QuestionEditor({ centerId, initial, onCancel, onSaved }: { centerId: string; initial: any; onCancel: () => void; onSaved: () => void; }) {
  const { toast } = useToast();
  const { register, handleSubmit, control, watch, setValue } = useForm({
    defaultValues: initial ? { ...initial } : {
      questionText: { ar: '', en: '' },
      questionType: 'text',
      isRequired: true,
      options: [],
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'options' });
  const qType = watch('questionType');

  const mut = useMutation({
    mutationFn: (data: any) => initial ? api.medicalCenters.updateQuestion(centerId, initial.id, data) : api.medicalCenters.createQuestion(centerId, data),
    onSuccess: () => { toast('success', 'تم الحفظ'); onSaved(); },
    onError: (e: any) => toast('error', e.message),
  });

  return (
    <form onSubmit={handleSubmit((d) => mut.mutate(d))} className="space-y-5 bg-white p-2 rounded-xl">
      <FormField label="نص السؤال" required>
        <BilingualInput 
          arValue={watch('questionText.ar')} enValue={watch('questionText.en')} 
          onArChange={(v) => setValue('questionText.ar', v)} onEnChange={(v) => setValue('questionText.en', v)} 
          placeholder={{ ar: 'السؤال...', en: 'Question...' }} 
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="نوع الإجابة" required>
          <select {...register('questionType')} className={selectCls}>
            <option value="text">نص حر (Text)</option>
            <option value="textarea">نص طويل (Textarea)</option>
            <option value="select">قائمة منسدلة (Select)</option>
            <option value="radio">خيارات متعددة (Radio)</option>
          </select>
        </FormField>
        
        <div className="flex items-center pt-8">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" {...register('isRequired')} className="w-5 h-5 rounded border-gray-300 text-primary-600" />
            <span className="text-sm font-medium">سؤال إجباري</span>
          </label>
        </div>
      </div>

      {['select', 'radio', 'checkbox'].includes(qType) && (
        <div className="border border-gray-100 p-4 rounded-xl space-y-4 bg-gray-50/50">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-gray-800">الخيارات</h4>
            <button type="button" onClick={() => append({ label: { ar: '', en: '' }, value: '' })} className="text-xs font-bold text-primary-600 flex items-center gap-1 hover:underline">
              <Plus size={14} /> إضافة خيار
            </button>
          </div>
          
          {fields.map((f, i) => (
            <div key={f.id} className="flex gap-2 items-start bg-white p-3 rounded-lg border border-gray-200">
              <div className="flex-1 space-y-3">
                <BilingualInput 
                  arValue={watch(`options.${i}.label.ar`)} enValue={watch(`options.${i}.label.en`)} 
                  onArChange={(v) => setValue(`options.${i}.label.ar`, v)} onEnChange={(v) => setValue(`options.${i}.label.en`, v)} 
                  placeholder={{ ar: 'تسمية الخيار (عربي)', en: 'Label (English)' }} 
                />
                <input {...register(`options.${i}.value`)} className={inputCls} placeholder="القيمة البرمجية (Value)" dir="ltr" />
              </div>
              <button type="button" onClick={() => remove(i)} className="text-red-500 p-2 hover:bg-red-50 rounded-lg mt-1"><Trash2 size={16} /></button>
            </div>
          ))}
          {fields.length === 0 && <p className="text-xs text-gray-500 text-center py-2">لم تقم بإضافة خيارات</p>}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <button type="button" onClick={onCancel} className="px-5 py-2 text-sm rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition">رجوع</button>
        <button type="submit" disabled={mut.isPending} className="px-6 py-2 text-sm rounded-xl bg-[#0B1F3A] text-white hover:bg-[#0E7C86] transition disabled:opacity-50">
          {mut.isPending ? 'جاري الحفظ...' : 'حفظ السؤال'}
        </button>
      </div>
    </form>
  );
}
