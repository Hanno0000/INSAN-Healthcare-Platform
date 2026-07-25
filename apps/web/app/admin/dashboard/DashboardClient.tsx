'use client';

import { useAdminUser } from '@/lib/admin-context';

const stats = [
  { label: 'المستشفيات', value: '2', icon: '🏥', color: 'bg-blue-50 text-blue-700 border-blue-100' },
  { label: 'المراكز الطبية', value: '12', icon: '🔬', color: 'bg-teal-50 text-teal-700 border-teal-100' },
  { label: 'الصفحات', value: '9', icon: '📄', color: 'bg-purple-50 text-purple-700 border-purple-100' },
  { label: 'طلبات المواعيد', value: '0', icon: '📅', color: 'bg-orange-50 text-orange-700 border-orange-100' },
];

export default function DashboardClient() {
  const { user } = useAdminUser();

  return (
    <div className="space-y-6" dir="rtl">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          مرحباً، {user?.name || 'مدير النظام'} 👋
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          هذه لوحة التحكم الرئيسية لمنظومة إنسان للرعاية الصحية
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-2xl border p-5 flex flex-col gap-2 ${stat.color}`}
          >
            <span className="text-2xl">{stat.icon}</span>
            <div>
              <p className="text-3xl font-bold">{stat.value}</p>
              <p className="text-sm mt-0.5 opacity-80">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">إجراءات سريعة</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            { label: 'إدارة الصفحات', href: '/admin/pages', icon: '📄' },
            { label: 'إدارة المستشفيات', href: '/admin/hospitals', icon: '🏥' },
            { label: 'إدارة المراكز', href: '/admin/medical-centers', icon: '🔬' },
            { label: 'إدارة الأطباء', href: '/admin/doctors', icon: '👨‍⚕️' },
            { label: 'إدارة الأخبار', href: '/admin/news', icon: '📰' },
            { label: 'مكتبة الوسائط', href: '/admin/media', icon: '🖼️' },
            { label: 'المواعيد', href: '/admin/appointments', icon: '📅' },
            { label: 'الإعدادات', href: '/admin/settings', icon: '⚙️' },
          ].map((action) => (
            <a
              key={action.label}
              href={action.href}
              className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all group"
            >
              <span className="text-xl">{action.icon}</span>
              <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">
                {action.label}
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* System Info */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">معلومات النظام</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-50">
            <span className="text-gray-500">الدور</span>
            <span className="font-medium text-gray-900">{user?.roleName || '—'}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-50">
            <span className="text-gray-500">البريد الإلكتروني</span>
            <span className="font-medium text-gray-900 ltr">{user?.email || '—'}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-500">الإصدار</span>
            <span className="font-medium text-gray-900">1.0.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
