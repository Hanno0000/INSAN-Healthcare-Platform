'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/admin/ui/Toast';
import PageHeader from '@/components/admin/ui/PageHeader';
import FormField, { inputCls, selectCls } from '@/components/admin/ui/FormField';
import BilingualInput from '@/components/admin/ui/BilingualInput';
import RichTextEditor from '@/components/admin/ui/RichTextEditor';

export default function NewsEditorClient({ editingId }: { editingId?: string }) {
  const router = useRouter();
  const { toast } = useToast();
  
  const { register, handleSubmit, reset, setValue, watch } = useForm<any>({
    defaultValues: { title: { ar: '', en: '' }, excerpt: { ar: '', en: '' }, body: { ar: '', en: '' }, categoryId: '', featuredImage: '' },
  });

  const [loadingInitial, setLoadingInitial] = useState(!!editingId);

  // Fetch categories
  const { data: cats } = useQuery({ 
    queryKey: ['news-cats-select'], 
    queryFn: () => api.news.listCategories({ pageSize: 100 }) 
  });

  // Fetch existing post if editing
  useEffect(() => {
    if (editingId) {
      api.news.getPost(editingId).then((res) => {
        const post = res.data;
        reset({
          title: post.title ?? { ar: '', en: '' },
          excerpt: post.excerpt ?? { ar: '', en: '' },
          body: post.body ?? { ar: '', en: '' },
          categoryId: post.categoryId ?? '',
          featuredImage: post.featuredImage ?? '',
        });
        setLoadingInitial(false);
      }).catch((e) => {
        toast('error', 'فشل في جلب بيانات المقال');
        router.push('/admin/news');
      });
    }
  }, [editingId, reset, router, toast]);

  const mut = useMutation({
    mutationFn: (data: any) => editingId ? api.news.updatePost(editingId, data) : api.news.createPost(data),
    onSuccess: () => { 
      toast('success', editingId ? 'تم التحديث بنجاح' : 'تم النشر بنجاح'); 
      router.push('/admin/news'); 
    },
    onError: (e: any) => toast('error', e.message),
  });

  const f = (k: string) => ({ ar: watch(`${k}.ar`), en: watch(`${k}.en`) });
  const featuredImage = watch('featuredImage');

  if (loadingInitial) {
    return <div className="p-8 text-center text-gray-500">جاري التحميل...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <PageHeader
        title={editingId ? 'تعديل المقال' : 'مقال جديد'}
        action="رجوع"
        onAction={() => router.push('/admin/news')}
      />

      <form onSubmit={handleSubmit((d) => mut.mutate(d))} className="space-y-6 mt-6 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <FormField label="العنوان (العربية مطلوبة، والإنجليزية اختيارية)" required>
          <BilingualInput 
            arValue={f('title').ar} enValue={f('title').en} 
            onArChange={(v) => setValue('title.ar', v)} 
            onEnChange={(v) => setValue('title.en', v)} 
            placeholder={{ ar: 'عنوان المقال', en: 'Article title (Optional)' }} 
          />
        </FormField>
        
        <FormField label="المقتطف (وصف قصير)">
          <BilingualInput 
            arValue={f('excerpt').ar} enValue={f('excerpt').en} 
            onArChange={(v) => setValue('excerpt.ar', v)} 
            onEnChange={(v) => setValue('excerpt.en', v)} 
            multiline rows={2} 
            placeholder={{ ar: 'مقتطف يظهر في القوائم...', en: 'Excerpt...' }} 
          />
        </FormField>

        {/* Rich Text Editor */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">محتوى المقال (عربي)</label>
            <RichTextEditor
              value={f('body').ar || ''}
              onChange={(v) => setValue('body.ar', v)}
              dir="rtl"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">محتوى المقال (إنجليزي)</label>
            <RichTextEditor
              value={f('body').en || ''}
              onChange={(v) => setValue('body.en', v)}
              dir="ltr"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField label="التصنيف">
            <select {...register('categoryId')} className={selectCls}>
              <option value="">— اختر تصنيف —</option>
              {cats?.data.map((c: any) => <option key={c.id} value={c.id}>{c.name?.ar}</option>)}
            </select>
          </FormField>
          
          <div>
            <FormField label="صورة الغلاف (رابط URL)">
              <input {...register('featuredImage')} dir="ltr" className={inputCls} placeholder="https://..." />
            </FormField>
            {featuredImage && (
              <div className="mt-3 rounded-xl overflow-hidden border border-gray-200 h-32 w-48 relative">
                <img src={featuredImage} alt="Preview" className="object-cover w-full h-full" onError={(e) => (e.currentTarget.style.display = 'none')} />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 mt-8">
          <button type="button" onClick={() => router.push('/admin/news')} className="px-6 py-2.5 text-sm font-medium rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
            إلغاء
          </button>
          <button type="submit" disabled={mut.isPending} className="px-8 py-2.5 text-sm font-medium rounded-xl bg-[#0B1F3A] text-white hover:bg-[#0E7C86] transition disabled:opacity-50 shadow-sm">
            {mut.isPending ? 'جاري الحفظ...' : (editingId ? 'حفظ التعديلات' : 'نشر المقال')}
          </button>
        </div>
      </form>
    </div>
  );
}
