import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'الصفحات | إنسان' };

export default function PagesAdminPage() {
  return (
    <div dir="rtl" className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">الصفحات</h1>
        <button className="bg-[#0B1F3A] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#0E7C86] transition-colors">
          + إنشاء صفحة
        </button>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <p className="text-gray-500 text-sm text-center py-8">
          📄 سيتم عرض قائمة الصفحات هنا — هذه الشاشة ستُبنى في المرحلة التالية
        </p>
      </div>
    </div>
  );
}
