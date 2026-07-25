import Link from 'next/link';
import PublicLayout from '@/components/public/PublicLayout';

export default function NotFound() {
  return (
    <PublicLayout>
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
        <div className="text-8xl font-black text-gray-100 select-none mb-2">٤٠٤</div>
        <h1 className="text-2xl font-bold text-primary-900 mb-3">الصفحة غير موجودة</h1>
        <p className="text-gray-500 text-base max-w-sm mb-8">
          الصفحة التي تبحث عنها غير موجودة أو تم نقلها إلى عنوان آخر.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/"
            className="bg-secondary-500 hover:bg-secondary-500/90 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            الرئيسية
          </Link>
          <Link
            href="/hospitals"
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            المستشفيات
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}
