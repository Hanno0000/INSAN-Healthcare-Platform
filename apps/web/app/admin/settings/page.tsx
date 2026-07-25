import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'الإعدادات | إنسان' };

export default function SettingsAdminPage() {
  return (
    <div dir="rtl" className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">الإعدادات</h1>
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <p className="text-gray-500 text-sm text-center py-8">
          ⚙️ شاشة الإعدادات ستُبنى في المرحلة التالية
        </p>
      </div>
    </div>
  );
}
