'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Building2, Stethoscope, UserRound, Newspaper, Calendar, Mail, Quote, Users } from 'lucide-react';
import Link from 'next/link';

interface StatCard {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  href: string;
  color: string;
}

function StatCard({ label, value, icon, href, color }: StatCard) {
  return (
    <Link href={href} className="bg-white rounded-2xl p-5 flex items-center gap-4 border border-gray-100 hover:shadow-md transition-shadow group">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 group-hover:text-[#0B1F3A] transition">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </Link>
  );
}

export default function DashboardClient() {
  const { data: hospitals } = useQuery({ queryKey: ['hospitals-count'], queryFn: () => api.hospitals.list({ pageSize: 1 }) });
  const { data: medCenters } = useQuery({ queryKey: ['med-centers-count'], queryFn: () => api.medicalCenters.list({ pageSize: 1 }) });
  const { data: doctors } = useQuery({ queryKey: ['doctors-count'], queryFn: () => api.doctors.list({ pageSize: 1 }) });
  const { data: news } = useQuery({ queryKey: ['news-count'], queryFn: () => api.news.listPosts({ pageSize: 1 }) });
  const { data: appointments } = useQuery({ queryKey: ['appts-count'], queryFn: () => api.appointments.list({ pageSize: 1 }) });
  const { data: contacts } = useQuery({ queryKey: ['contacts-count'], queryFn: () => api.contact.list({ pageSize: 1 }) });
  const { data: testimonials } = useQuery({ queryKey: ['testimonials-count'], queryFn: () => api.testimonials.list({ pageSize: 1 }) });
  const { data: users } = useQuery({ queryKey: ['users-count'], queryFn: () => api.users.list({ pageSize: 1 }) });

  const stats: StatCard[] = [
    { label: 'المستشفيات', value: hospitals?.meta.total ?? '—', icon: <Building2 size={22} className="text-blue-600" />, href: '/admin/hospitals', color: 'bg-blue-50' },
    { label: 'المراكز الطبية', value: medCenters?.meta.total ?? '—', icon: <Stethoscope size={22} className="text-teal-600" />, href: '/admin/medical-centers', color: 'bg-teal-50' },
    { label: 'الأطباء', value: doctors?.meta.total ?? '—', icon: <UserRound size={22} className="text-purple-600" />, href: '/admin/doctors', color: 'bg-purple-50' },
    { label: 'الأخبار', value: news?.meta.total ?? '—', icon: <Newspaper size={22} className="text-orange-500" />, href: '/admin/news', color: 'bg-orange-50' },
    { label: 'المواعيد', value: appointments?.meta.total ?? '—', icon: <Calendar size={22} className="text-emerald-600" />, href: '/admin/appointments', color: 'bg-emerald-50' },
    { label: 'رسائل التواصل', value: contacts?.meta.total ?? '—', icon: <Mail size={22} className="text-red-500" />, href: '/admin/contact-submissions', color: 'bg-red-50' },
    { label: 'آراء العملاء', value: testimonials?.meta.total ?? '—', icon: <Quote size={22} className="text-yellow-600" />, href: '/admin/testimonials', color: 'bg-yellow-50' },
    { label: 'المستخدمون', value: users?.meta.total ?? '—', icon: <Users size={22} className="text-gray-600" />, href: '/admin/users', color: 'bg-gray-100' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">لوحة التحكم</h1>
        <p className="text-sm text-gray-500 mt-0.5">نظرة عامة على منظومة إنسان</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => <StatCard key={s.href} {...s} />)}
      </div>

      {/* Quick links */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickCard title="إضافة مستشفى" desc="أضف مستشفى جديداً للمنظومة" href="/admin/hospitals" color="bg-[#0B1F3A]" />
        <QuickCard title="نشر خبر" desc="أضف مقالاً أو خبراً جديداً" href="/admin/news" color="bg-[#0E7C86]" />
        <QuickCard title="الإعدادات" desc="إدارة إعدادات الموقع والعلامة التجارية" href="/admin/settings" color="bg-[#0B5FFF]" />
      </div>
    </div>
  );
}

function QuickCard({ title, desc, href, color }: { title: string; desc: string; href: string; color: string }) {
  return (
    <Link href={href} className={`${color} text-white rounded-2xl p-5 hover:opacity-90 transition group`}>
      <p className="font-semibold">{title}</p>
      <p className="text-white/70 text-sm mt-1">{desc}</p>
    </Link>
  );
}
