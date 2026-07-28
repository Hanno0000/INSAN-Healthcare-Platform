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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-heading font-montserrat mb-6">{t(dept.name)}</h2>
              {dept.description && (
                <div className="prose max-w-none font-cairo text-default leading-relaxed">
                  <p>{t(dept.description)}</p>
                </div>
              )}
            </div>
            {dept.image && (
              <div className="rounded-card overflow-hidden shadow-floating aspect-video">
                <img src={dept.image} alt={t(dept.name)} className="w-full h-full object-cover" />
              </div>
            )}
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
