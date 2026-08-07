import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import PublicLayout from '@/components/public/PublicLayout';
import Breadcrumb from '@/components/public/Breadcrumb';
import { getMedicalCenter } from '@/lib/public-api';
import { t } from '@/lib/utils';

interface Props { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const res = await getMedicalCenter(params.slug);
  if (!res?.data) return { title: 'برنامج طبي | منظومة إنسان' };
  return {
    title: t(res.data.metaTitle) || `${t(res.data.name)} | منظومة إنسان`,
    description: t(res.data.metaDescription) || t(res.data.shortDescription),
  };
}

export default async function ProgramDetailPage({ params }: Props) {
  const res = await getMedicalCenter(params.slug);
  if (!res?.data || res.data.type !== 'PROGRAM') notFound();
  const c = res.data;
  const color = c.brandColor || '#0E7C86';

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative bg-primary-900 text-white py-20 overflow-hidden">
        {c.heroImage && (
          <div className="absolute inset-0">
            <img src={c.heroImage} alt="" className="w-full h-full object-cover opacity-20" />
          </div>
        )}
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, #0B1F3A 60%, ${color}40)` }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <Breadcrumb crumbs={[
            { label: 'الرئيسية', href: '/' },
            { label: 'البرامج الطبية', href: '/programs' },
            { label: t(c.name) },
          ]} />
          <div className="flex items-start gap-5 mt-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold border border-white/20 shrink-0" style={{ backgroundColor: `${color}40` }}>
              {t(c.name).charAt(0)}
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">{t(c.name)}</h1>
              {c.shortDescription && <p className="text-white/70 text-base mt-2 max-w-xl">{t(c.shortDescription)}</p>}
              {c.hospitals && c.hospitals.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {c.hospitals.map((h, i) => (
                    <Link key={h.id || h.slug || i} href={`/hospitals/${h.slug}`} className="inline-block text-xs bg-white/10 hover:bg-white/20 rounded-full px-3 py-1 border border-white/20 transition-colors">
                      {t(h.name)}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="mt-8">
            <Link
              href={`/book?medicalCenterId=${c.id}`}
              className="bg-secondary-500 hover:bg-secondary-500/90 text-white font-semibold px-6 py-3 rounded-xl transition-colors inline-block"
            >
              احجز عيادتك
            </Link>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {c.description && (
            <div className="max-w-3xl mb-12">
              <h2 className="text-xl font-bold text-primary-900 mb-4">عن البرنامج</h2>
              <p className="text-gray-600 leading-relaxed">{t(c.description)}</p>
            </div>
          )}

          {c.features && Array.isArray(c.features) && c.features.length > 0 && (
            <div className="mb-12">
              <h2 className="text-xl font-bold text-primary-900 mb-4">مميزات البرنامج</h2>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {c.features.map((feature: any, i: number) => (
                  <li key={i} className="flex items-start gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="text-secondary-500 mt-1">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <span className="text-gray-700">{t(feature.title || feature)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {c.services && c.services.length > 0 ? (
            <div className="mt-8 p-6 bg-gray-50 rounded-2xl border border-gray-100">
              <h2 className="text-xl font-bold text-primary-900 mb-4">الخدمات والمراحل</h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {c.services.map((service: any, i: number) => (
                  <li key={service.id || i} className="flex flex-col gap-1 p-3 bg-white rounded-lg shadow-sm border border-gray-50">
                    <div className="flex items-center gap-3">
                       <div className="w-2 h-2 rounded-full bg-secondary-500"></div>
                       <span className="text-gray-800 font-medium">{t(service.name)}</span>
                    </div>
                    {service.description && (
                       <span className="text-gray-500 text-sm mr-5">{t(service.description)}</span>
                    )}
                  </li>
                ))}
              </ul>
              <div className="mt-6 border-t border-gray-200 pt-4">
                <p className="text-gray-500 text-sm">تواصل مع فريقنا للاستفسار عن تفاصيل البرنامج.</p>
                <Link href="/contact" className="mt-2 inline-block text-secondary-500 hover:underline text-sm font-medium">
                  تواصل معنا
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-8 p-6 bg-gray-50 rounded-2xl border border-gray-100">
              <h2 className="text-lg font-bold text-primary-900 mb-2">الخدمات والمراحل</h2>
              <p className="text-gray-500 text-sm">تواصل مع فريقنا لمعرفة الخدمات المتوفرة في هذا البرنامج.</p>
              <Link href="/contact" className="mt-4 inline-block text-secondary-500 hover:underline text-sm font-medium">
                تواصل معنا
              </Link>
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
