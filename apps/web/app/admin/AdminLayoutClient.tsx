'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { AdminUserContext } from '@/lib/admin-context';
import type { AdminUser } from '@/lib/auth';
import { api, setAccessToken } from '@/lib/api-client';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60 * 1000, retry: 1 } },
});

export default function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname?.includes('/login');

  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(!isLoginPage);

  useEffect(() => {
    if (isLoginPage) return;

    // Try to restore session via refresh token
    api.auth
      .refresh()
      .then((res) => {
        setAccessToken(res.data.accessToken);
        return api.auth.me();
      })
      .then((res: any) => {
        setUser(res.data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        router.replace('/admin/login');
      });
  }, [isLoginPage, router]);

  if (isLoginPage) {
    return (
      <QueryClientProvider client={queryClient}>
        <AdminUserContext.Provider value={{ user: null, setUser }}>
          {children}
        </AdminUserContext.Provider>
      </QueryClientProvider>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AdminUserContext.Provider value={{ user, setUser }}>
        <div className="flex h-screen overflow-hidden bg-gray-50">
          <AdminSidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <AdminHeader />
            <main className="flex-1 overflow-y-auto p-6">{children}</main>
          </div>
        </div>
      </AdminUserContext.Provider>
    </QueryClientProvider>
  );
}
