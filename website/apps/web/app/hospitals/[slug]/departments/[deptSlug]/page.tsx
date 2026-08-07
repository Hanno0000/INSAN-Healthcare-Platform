import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PublicLayout from '@/components/public/PublicLayout';
import PageTitle from '@/components/public/PageTitle';
import DoctorCard from '@/components/public/DoctorCard';
import { getHospital } from '@/lib/public-api';
import { t } from '@/lib/utils';

interface Props { params: { slug: string; deptSlug: string } }

/** يبحث عن القسم داخل مصفوفة departments بالـ slug */
function findDept(hospital: any, deptSlug: string) {
  const list = Array.isArray(hospital?.departments) ? hospital.departments : [];
  return list.find((d: any) => d?.slug === deptSlug) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const res = await getHospital(params.slug);
  const dept = findDept(res?.data, params.deptSlug);
  if (!dept) return { title: 'قسم | منظومة إنسان' };
  return {
    title: `${t(dept.name)} | ${t(res!.data.name)}`,
    description: t(dept.shortDescription) || t(dept.description),
  };
}

export default async function DepartmentPage({ params }: Props) {
  const res = await getHospital(params.slug);
  if (!res?.data) notFound();

  const dept = findDept(res.data, params.deptSlug);
  if (!dept) notFound();

  // أطباء هذا القسم = الأطباء الذين اختارهم الأدمن في doctorIds
  const ids: string[] = Array.isArray(dept.doctorIds) ? dept.doctorIds : [];
  const doctors = (res.data.doctors ?? [])
    .map((link: any) => link.doctor)
    .filter((d: any) => d && ids.includes(d.id));

  return (
    <PublicLayout>
      <PageTitle
        title={t(dept.name)}
        breadcrumbs={[
          { label: 'المستشفيات', href: '/hospitals' },
          { label: t(res.data.name), href: `/hospitals/${params.slug}` },
          { label: t(dept.name) },
        ]}
      />

      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 md:px-8 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl font-bold text-heading font-montserrat mb-6">{t(dept.name)}</h2>
                {dept.description && (
                  <div className="prose max-w-none font-cairo text-default leading-relaxed">
                    <p>{t(dept.description)}</p>
                  </div>
                )}
              </div>

              {Array.isArray(dept.features) && dept.features.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-heading font-montserrat mb-4">مميزات القسم</h3>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {dept.features.map((f: any, i: number) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                        <span className="w-2 h-2 rounded-full bg-primary" />
                        {t(f)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {Array.isArray(dept.services) && dept.services.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-heading font-montserrat mb-4">الخدمات الطبية</h3>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {dept.services.map((s: any, i: number) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                        <span className="w-2 h-2 rounded-full bg-secondary" />
                        {t(s)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {Array.isArray(dept.equipment) && dept.equipment.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-heading font-montserrat mb-4">الأجهزة والتقنيات</h3>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {dept.equipment.map((e: any, i: number) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                        <span className="w-2 h-2 rounded-full bg-[#0E7C86]" />
                        {t(e)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="space-y-6">
              {dept.videoUrl ? (
                <div className="rounded-card overflow-hidden shadow-floating aspect-video relative bg-black">
                  <iframe 
                    src={dept.videoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')} 
                    className="absolute inset-0 w-full h-full"
                    allowFullScreen
                    title={t(dept.name)}
                  />
                </div>
              ) : dept.image ? (
                <div className="rounded-card overflow-hidden shadow-floating aspect-video">
                  <img src={dept.image} alt={t(dept.name)} className="w-full h-full object-cover" />
                </div>
              ) : null}

              {Array.isArray(dept.images) && dept.images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {dept.images.map((img: string, i: number) => (
                    <div key={i} className="aspect-square rounded-xl overflow-hidden shadow-sm">
                      <img src={img} alt={`${t(dept.name)} - ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {doctors.length > 0 && (
        <section className="py-16 bg-light-bg">
          <div className="container mx-auto px-4 md:px-8 max-w-7xl">
            <h3 className="text-2xl font-bold text-heading font-montserrat mb-10 text-center">
              أطباء القسم
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {doctors.map((d: any) => <DoctorCard key={d.id} doctor={d} />)}
            </div>
          </div>
        </section>
      )}
    </PublicLayout>
  );
}
