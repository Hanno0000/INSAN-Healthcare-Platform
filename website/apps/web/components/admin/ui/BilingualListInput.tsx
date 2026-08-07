'use client';

import { useState } from 'react';
import { useFieldArray, type Control, type UseFormRegister } from 'react-hook-form';
import { Plus, Trash2, ChevronUp, ChevronDown, ClipboardPaste } from 'lucide-react';
import { inputCls, textareaCls } from './FormField';

interface Props {
  control: Control<any>;
  register: UseFormRegister<any>;
  /** مسار الحقل داخل النموذج — مثال: departments.0.services */
  name: string;
  label: string;
  hint?: string;
  placeholder?: { ar?: string; en?: string };
  /** نص زر الإضافة — مثال: "إضافة خدمة" */
  addLabel?: string;
}

/**
 * محرّر قائمة ثنائية اللغة: كل عنصر صف فيه خانة عربي وخانة إنجليزي.
 *
 * يحلّ محلّ خانات الـ JSON الخام التي كانت تُستخدم للأجهزة والخدمات والمميزات.
 * القيمة المخزَّنة في النموذج تبقى كما هي: مصفوفة من { ar, en } — فلا يحتاج
 * الـ API ولا صفحات العرض أي تغيير.
 */
export default function BilingualListInput({
  control, register, name, label, hint, placeholder, addLabel = 'إضافة عنصر',
}: Props) {
  const { fields, append, remove, swap, replace } = useFieldArray({ control, name });
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');

  /**
   * يحوّل نصاً ملصوقاً إلى صفوف. يقبل شكلين:
   *   - سطر لكل عنصر: "الفرز الفوري"  أو  "الفرز الفوري | Immediate triage"
   *   - مصفوفة JSON كاملة (للتوافق مع البيانات القديمة)
   */
  const applyBulk = () => {
    const text = bulkText.trim();
    if (!text) return;

    if (text.startsWith('[')) {
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          replace(parsed.map((v: any) =>
            typeof v === 'string' ? { ar: v, en: '' } : { ar: v?.ar ?? '', en: v?.en ?? '' },
          ));
          setBulkText('');
          setBulkOpen(false);
          return;
        }
      } catch {
        // ليست JSON صالحة — عاملها كأسطر عادية بالأسفل
      }
    }

    const rows = text
      .split('\n')
      .map((line) => line.replace(/^\s*[-•*]\s*/, '').trim())
      .filter(Boolean)
      .map((line) => {
        const [ar, en] = line.split('|');
        return { ar: (ar ?? '').trim(), en: (en ?? '').trim() };
      });

    if (rows.length) {
      replace(rows);
      setBulkText('');
      setBulkOpen(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          {label}
          {fields.length > 0 && <span className="text-gray-400 font-normal"> ({fields.length})</span>}
        </label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setBulkOpen((v) => !v)}
            className="text-xs font-bold text-gray-500 flex items-center gap-1 hover:text-gray-700"
            title="لصق عدة عناصر دفعة واحدة"
          >
            <ClipboardPaste size={13} /> لصق مجمّع
          </button>
          <button
            type="button"
            onClick={() => append({ ar: '', en: '' })}
            className="text-xs font-bold text-[#0E7C86] flex items-center gap-1 hover:underline"
          >
            <Plus size={13} /> {addLabel}
          </button>
        </div>
      </div>

      {bulkOpen && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3 space-y-2">
          <p className="text-xs text-gray-500">
            الصق سطراً لكل عنصر. للإنجليزي أضف <span className="font-mono">|</span> بعد العربي:
            <br />
            <span className="font-mono text-[11px] text-gray-400">الفرز الفوري | Immediate triage</span>
          </p>
          <textarea
            dir="rtl"
            rows={4}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            className={textareaCls}
            placeholder={'الخدمة الأولى\nالخدمة الثانية | Second service'}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={applyBulk}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#0B1F3A] text-white hover:bg-[#0E7C86] transition"
            >
              استبدال القائمة بالمُلصَق
            </button>
            <button
              type="button"
              onClick={() => { setBulkOpen(false); setBulkText(''); }}
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-white transition"
            >
              إلغاء
            </button>
            <span className="text-xs text-amber-600">سيستبدل كل العناصر الحالية</span>
          </div>
        </div>
      )}

      {fields.length === 0 && !bulkOpen && (
        <p className="text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl py-3 text-center">
          لا توجد عناصر
        </p>
      )}

      <div className="space-y-2">
        {fields.map((f, i) => (
          <div key={f.id} className="flex items-start gap-2">
            <span className="text-[11px] font-bold text-gray-400 pt-2.5 w-5 shrink-0 text-center">{i + 1}</span>

            <div className="grid grid-cols-2 gap-2 flex-1">
              <input
                {...register(`${name}.${i}.ar`)}
                dir="rtl"
                className={inputCls}
                placeholder={placeholder?.ar ?? 'بالعربية'}
              />
              <input
                {...register(`${name}.${i}.en`)}
                dir="ltr"
                className={`${inputCls} font-latin`}
                placeholder={placeholder?.en ?? 'In English'}
              />
            </div>

            <div className="flex flex-col shrink-0">
              <button
                type="button"
                onClick={() => i > 0 && swap(i, i - 1)}
                disabled={i === 0}
                className="text-gray-400 hover:text-gray-700 disabled:opacity-25 disabled:hover:text-gray-400 px-1"
                title="تحريك لأعلى"
              >
                <ChevronUp size={14} />
              </button>
              <button
                type="button"
                onClick={() => i < fields.length - 1 && swap(i, i + 1)}
                disabled={i === fields.length - 1}
                className="text-gray-400 hover:text-gray-700 disabled:opacity-25 disabled:hover:text-gray-400 px-1"
                title="تحريك لأسفل"
              >
                <ChevronDown size={14} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => remove(i)}
              className="text-red-500 p-1.5 hover:bg-red-50 rounded-lg shrink-0 mt-0.5"
              title="حذف"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  );
}
