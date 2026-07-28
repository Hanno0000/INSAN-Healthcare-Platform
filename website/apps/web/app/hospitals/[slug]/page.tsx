import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import PublicLayout from '@/components/public/PublicLayout';
import PageTitle from '@/components/public/PageTitle';
import { getHospital } from '@/lib/public-api';
import { t } from '@/lib/utils';
import { Calendar, Phone, Activity, Users } from 'lucide-react';

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
  const color = h.brandColor || '#175cdd';

  return (
    <PublicLayout>
      <PageTitle 
        title={t(h.name)} 
        breadcrumbs={[
          { label: 'المستشفيات', href: '/hospitals' },
          { label: t(h.name) },
        ]} 
      />

      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 md:px-8 max-w-7xl">
          
          <div className="flex flex-col lg:flex-row gap-12">
            
            {/* Left Column (Content) */}
            <div className="lg:w-2/3">
              <div className="mb-8">
                {h.heroImage && (
                  <div className="rounded-card overflow-hidden shadow-floating mb-8 aspect-video">
                    <img src={h.heroImage} alt={t(h.name)} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex items-center gap-4 mb-6">
                  {h.logoUrl ? (
                    <img src={h.logoUrl} alt="" className="w-16 h-16 object-contain" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl font-bold text-white shadow-sm" style={{ backgroundColor: color }}>
                      {t(h.name).charAt(0)}
                    </div>
                  )}
                  <h2 className="text-3xl font-bold text-heading font-montserrat">{t(h.name)}</h2>
                </div>
                
                <h3 className="text-xl font-bold text-heading font-montserrat mb-4">نبذة عن المستشفى</h3>
                <div className="prose max-w-none font-cairo text-default leading-relaxed mb-10">
                  <p>{t(h.description)}</p>
                </div>
              </div>

              {/* Custom fields */}
              {h.customFields && Object.keys(h.customFields).length > 0 && (
                <div className="mb-10">
                  <h3 className="text-xl font-bold text-heading font-montserrat mb-6">معلومات إضافية</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Object.entries(h.customFields).map(([key, val]) => (
                      <div key={key} className="bg-light-bg rounded-xl p-5 border border-gray-100 flex flex-col justify-center">
                        <p className="text-xs text-gray-500 font-bold mb-1 uppercase tracking-wider font-montserrat">{key}</p>
                        <p className="text-base font-semibold text-heading font-cairo">{String(val)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Map */}
              {h.googleMapsUrl && (
                <div className="mb-10">
                  <h3 className="text-xl font-bold text-heading font-montserrat mb-6">الموقع على الخريطة</h3>
                  <div className="w-full h-[400px] rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                    <iframe 
                      src={h.googleMapsUrl} 
                      width="100%" 
                      height="100%" 
                      style={{ border: 0 }} 
                      allowFullScreen={false} 
                      loading="lazy" 
                      referrerPolicy="no-referrer-when-downgrade"
                      className="transition-all duration-500"
                    ></iframe>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column (Sidebar CTAs) */}
            <div className="lg:w-1/3">
              <div className="bg-light-bg rounded-card p-8 border border-gray-100 shadow-sm sticky top-24 font-cairo">
                <h4 className="text-xl font-bold text-heading font-montserrat mb-6 text-center">خدمات المستشفى</h4>
                
                <Link
                  href={`/book?hospitalId=${h.id}`}
                  className="flex items-center justify-center gap-2 w-full bg-accent-500 hover:bg-accent-600 text-white font-bold py-3.5 rounded-pill transition-all mb-4 shadow-card-hover"
                >
                  <Calendar className="w-5 h-5" />
                  احجز موعداً
                </Link>
                
                <Link
                  href="/contact"
                  className="flex items-center justify-center gap-2 w-full bg-white text-heading hover:bg-gray-50 hover:text-accent-500 font-bold py-3.5 rounded-pill transition-all mb-8 border border-gray-200"
                >
                  <Phone className="w-5 h-5" />
                  تواصل للاستفسار
                </Link>

                <div className="border-t border-gray-200 pt-6 flex flex-col gap-4">
                  <Link
                    href={`/medical-centers`}
                    className="flex items-center gap-4 group"
                  >
                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:bg-accent-500 transition-colors">
                      <Activity className="w-5 h-5 text-accent-500 group-hover:text-white transition-colors" />
                    </div>
                    <div>
                      <p className="font-bold text-heading group-hover:text-accent-500 transition-colors">المراكز الطبية التابعة</p>
                      <p className="text-xs text-gray-500">استعرض المراكز المرتبطة</p>
                    </div>
                  </Link>

                  <Link
                    href={`/doctors`}
                    className="flex items-center gap-4 group"
                  >
                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:bg-accent-500 transition-colors">
                      <Users className="w-5 h-5 text-accent-500 group-hover:text-white transition-colors" />
                    </div>
                    <div>
                      <p className="font-bold text-heading group-hover:text-accent-500 transition-colors">أطباء المستشفى</p>
                      <p className="text-xs text-gray-500">تصفح الأطباء المتخصصين</p>
                    </div>
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
