import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import PublicLayout from '@/components/public/PublicLayout';
import Breadcrumb from '@/components/public/Breadcrumb';
import { getHospital } from '@/lib/public-api';
import { t } from '@/lib/utils';

interface Props { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const res = await getHospital(params.slug);
  if (!res?.data) return { title: 'مستشفى | منظومة إنسان' };
  return {
    title: t(res.data.metaTitle) || `${t(res.data.name)} | منظومة إنسان`,
    description: t(res.data.metaDescription) || t(res.data.shortDescription),
  };
}

export default async function HospitalDetailPage({ params }: Props) {
  const res = await getHospital(params.slug);
  if (!res?.data) notFound();
  const h = res.data;
  const color = h.brandColor || '#0E7C86';

  return (
    <PublicLayout>
      {/* Hero */}
      <section
        className="relative bg-primary-900 text-white py-20 overflow-hidden"
        style={h.heroImage ? {} : {}}
      >
        {h.heroImage && (
          <div className="absolute inset-0">
            <img src={h.heroImage} alt="" className="w-full h-full object-cover opacity-20" />
          </div>
        )}
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, #0B1F3A 60%, ${color}40)` }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <Breadcrumb crumbs={[
            { label: 'الرئيسية', href: '/' },
            { label: 'المستشفيات', href: '/hospitals' },
            { label: t(h.name) },
          ]} />

          <div className="flex items-start gap-5 mt-4">
            {h.logoUrl ? (
              <img src={h.logoUrl} alt="" className="w-16 h-16 rounded-2xl object-contain bg-white/10 p-2 border border-white/20" />
            ) : (
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold border border-white/20" style={{ backgroundColor: `${color}40` }}>
                {t(h.name).charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">{t(h.name)}</h1>
              <p className="text-white/70 text-base mt-2 max-w-xl">{t(h.shortDescription)}</p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`/book?hospitalId=${h.id}`}
              className="bg-secondary-500 hover:bg-secondary-500/90 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              احجز موعداً في هذا المستشفى
            </Link>
            <Link
              href="/contact"
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              تواصل معنا
            </Link>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-3xl">
            <h2 className="text-xl font-bold text-primary-900 mb-4">عن المستشفى</h2>
            <div className="prose prose-gray max-w-none text-gray-600 leading-relaxed">
              <p>{t(h.description)}</p>
            </div>
          </div>

          {/* Custom fields */}
          {h.customFields && Object.keys(h.customFields).length > 0 && (
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(h.customFields).map(([key, val]) => (
                <div key={key} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="text-xs text-gray-400 mb-1 uppercase tracking-wider">{key}</p>
                  <p className="text-sm font-medium text-gray-800">{String(val)}</p>
                </div>
              ))}
            </div>
          )}

          {/* Related CTAs */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href={`/medical-centers`}
              className="flex items-center gap-4 bg-gray-50 hover:bg-gray-100 border border-gray-100 rounded-2xl p-5 transition-colors group"
            >
              <div className="w-10 h-10 rounded-xl bg-secondary-500/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-secondary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-primary-900 text-sm group-hover:text-secondary-500 transition-colors">المراكز الطبية</p>
                <p className="text-xs text-gray-500 mt-0.5">استعرض المراكز المرتبطة</p>
              </div>
            </Link>
            <Link
              href={`/doctors`}
              className="flex items-center gap-4 bg-gray-50 hover:bg-gray-100 border border-gray-100 rounded-2xl p-5 transition-colors group"
            >
              <div className="w-10 h-10 rounded-xl bg-secondary-500/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-secondary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-primary-900 text-sm group-hover:text-secondary-500 transition-colors">أطباء المستشفى</p>
                <p className="text-xs text-gray-500 mt-0.5">تصفح الأطباء المتخصصين</p>
              </div>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
