import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'المستشفيات | إنسان' };

export default function HospitalsAdminPage() {
  return (
    <div dir="rtl" className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">المستشفيات</h1>
        <a href="/admin/hospitals/create" className="bg-[#0B1F3A] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#0E7C86] transition-colors">
          + إضافة مستشفى
        </a>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <p className="text-gray-500 text-sm text-center py-8">
          🏥 سيتم عرض قائمة المستشفيات هنا — هذه الشاشة ستُبنى في المرحلة التالية
        </p>
      </div>
    </div>
  );
}
