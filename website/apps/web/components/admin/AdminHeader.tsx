'use client';

import { useAdminUser } from '@/lib/admin-context';
import { logout } from '@/lib/auth';

export default function AdminHeader() {
  const { user } = useAdminUser();

  const handleLogout = async () => {
    if (confirm('هل تريد تسجيل الخروج؟')) {
      await logout();
    }
  };

  return (
    <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-2">
        <h1 className="text-gray-900 font-semibold text-sm">لوحة تحكم منظومة إنسان</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Visit site */}
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1.5 transition-colors"
        >
          <span>🌐</span>
          <span>زيارة الموقع</span>
        </a>

        {/* User menu */}
        {user && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{user.email}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-red-500 hover:text-red-700 transition-colors font-medium"
            >
              خروج
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
