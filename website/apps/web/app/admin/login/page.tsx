import type { Metadata } from 'next';
import { Suspense } from 'react';
import LoginForm from './LoginForm';

export const metadata: Metadata = {
  title: 'تسجيل الدخول | لوحة تحكم إنسان',
  robots: { index: false },
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B1F3A] to-[#0E7C86] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur mb-4">
            <span className="text-white text-2xl font-bold">إ</span>
          </div>
          <h1 className="text-white text-2xl font-bold">منظومة إنسان</h1>
          <p className="text-white/70 text-sm mt-1">لوحة تحكم المنصة</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-gray-900 text-xl font-semibold mb-6 text-center">
            تسجيل الدخول
          </h2>
          {/* Suspense required because LoginForm uses useSearchParams() */}
          <Suspense fallback={<div className="py-4 text-center text-gray-400 text-sm">جاري التحميل...</div>}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="text-white/50 text-xs text-center mt-6">
          © 2026 منظومة إنسان للرعاية الصحية. جميع الحقوق محفوظة.
        </p>
      </div>
    </div>
  );
}
