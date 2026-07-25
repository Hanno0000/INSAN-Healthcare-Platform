'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdminUser } from '@/lib/admin-context';
import { hasPermission } from '@/lib/auth';

const navItems = [
  { label: 'لوحة التحكم', href: '/admin/dashboard', icon: '🏠', module: null, action: null },
  { label: 'الصفحات', href: '/admin/pages', icon: '📄', module: 'pages', action: 'view' },
  { label: 'المستشفيات', href: '/admin/hospitals', icon: '🏥', module: 'hospitals', action: 'view' },
  { label: 'المراكز الطبية', href: '/admin/medical-centers', icon: '🔬', module: 'medical-centers', action: 'view' },
  { label: 'الأطباء', href: '/admin/doctors', icon: '👨‍⚕️', module: 'doctors', action: 'view' },
  { label: 'الأخبار', href: '/admin/news', icon: '📰', module: 'news', action: 'view' },
  { label: 'المواعيد', href: '/admin/appointments', icon: '📅', module: 'appointments', action: 'view' },
  { label: 'رسائل التواصل', href: '/admin/contact-submissions', icon: '✉️', module: 'contact', action: 'view' },
  { label: 'الشهادات', href: '/admin/testimonials', icon: '⭐', module: 'testimonials', action: 'view' },
  { label: 'التنقل', href: '/admin/navigation', icon: '🔗', module: 'navigation', action: 'view' },
  { label: 'المستخدمون', href: '/admin/users', icon: '👥', module: 'users', action: 'view' },
  { label: 'العلامات التجارية', href: '/admin/brands', icon: '🏷️', module: 'settings', action: 'manage' },
  { label: 'سجل التدقيق', href: '/admin/audit-log', icon: '📋', module: 'audit', action: 'view' },
  { label: 'الإعدادات', href: '/admin/settings', icon: '⚙️', module: 'settings', action: 'view' },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { user } = useAdminUser();

  const visibleItems = navItems.filter((item) => {
    if (!item.module) return true; // Dashboard always visible
    return hasPermission(user, item.module, item.action || 'view');
  });

  return (
    <aside className="w-64 bg-[#0B1F3A] text-white flex flex-col h-full shrink-0">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
            <span className="text-lg font-bold">إ</span>
          </div>
          <div>
            <p className="font-bold text-sm">منظومة إنسان</p>
            <p className="text-white/50 text-xs">لوحة التحكم</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                isActive
                  ? 'bg-white/15 text-white font-medium'
                  : 'text-white/70 hover:text-white hover:bg-white/8'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User info at bottom */}
      {user && (
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-white/50 text-xs truncate">{user.roleName}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
