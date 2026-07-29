import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import PublicLayout from '@/components/public/PublicLayout';
import Breadcrumb from '@/components/public/Breadcrumb';
import DoctorReviewForm from '@/components/public/DoctorReviewForm';
import { getDoctor } from '@/lib/public-api';
import { t } from '@/lib/utils';

interface Props { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const res = await getDoctor(params.slug);
  if (!res?.data) return { title: 'طبيب | منظومة إنسان' };
  return {
    title: t(res.data.metaTitle) || `${t(res.data.name)} | منظومة إنسان`,
    description: t(res.data.metaDescription) || t(res.data.bio),
  };
}

export default async function DoctorDetailPage({ params }: Props) {
  const res = await getDoctor(params.slug);
  if (!res?.data) notFound();
  const d = res.data;

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="bg-primary-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <Breadcrumb crumbs={[
            { label: 'الرئيسية', href: '/' },
            { label: 'الأطباء', href: '/doctors' },
            { label: t(d.name) },
          ]} />
          <div className="flex flex-col sm:flex-row items-start gap-6 mt-4">
            {d.photo ? (
              <img src={d.photo} alt={t(d.name)} className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl object-cover border-2 border-white/20 shrink-0" />
            ) : (
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-secondary-500/20 flex items-center justify-center shrink-0">
                <svg className="w-12 h-12 text-secondary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            )}
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">{t(d.name)}</h1>
              {d.specialty && (
                <p className="text-secondary-500 text-lg font-medium mt-1">{t(d.specialty)}</p>
              )}
              {d.hospitals && d.hospitals.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {d.hospitals.map(h => (
                    <Link key={h.id} href={`/hospitals/${h.slug}`} className="text-xs bg-white/10 hover:bg-white/20 rounded-full px-3 py-1 border border-white/20 transition-colors">
                      {t(h.name)}
                    </Link>
                  ))}
                </div>
              )}
              <div className="mt-6">
                <Link
                  href={`/book?doctorId=${d.id}`}
                  className="bg-secondary-500 hover:bg-secondary-500/90 text-white font-semibold px-6 py-3 rounded-xl transition-colors inline-block"
                >
                  احجز موعداً مع الدكتور
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Profile */}
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          {d.bio && (
            <div className="mb-10">
              <h2 className="text-xl font-bold text-primary-900 mb-4">نبذة عن الطبيب</h2>
              <p className="text-gray-600 leading-relaxed">{t(d.bio)}</p>
            </div>
          )}

          {d.qualifications && (
            <div className="mb-10">
              <h2 className="text-xl font-bold text-primary-900 mb-4">المؤهلات والخبرات</h2>
              <p className="text-gray-600 leading-relaxed">{d.qualifications}</p>
            </div>
          )}

          {d.medicalCenters && d.medicalCenters.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-primary-900 mb-4">العيادات</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {d.medicalCenters.map(mc => (
                  <Link
                    key={mc.id}
                    href={`/medical-centers/${mc.slug}`}
                    className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-100 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-secondary-500/10 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-secondary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-primary-900 group-hover:text-secondary-500 transition-colors">
                      {t(mc.name)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Add Doctor Review Form */}
          <DoctorReviewForm doctorId={d.id} />
        </div>
      </section>
    </PublicLayout>
  );
}
