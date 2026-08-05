import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PublicLayout from '@/components/public/PublicLayout';
import PageTitle from '@/components/public/PageTitle';
import { getHospital, getNewsPosts } from '@/lib/public-api';
import { t } from '@/lib/utils';
import HospitalHeroSection from '@/components/public/HospitalHeroSection';
import HospitalClinicsSection from '@/components/public/HospitalClinicsSection';
import HospitalDepartmentsSection from '@/components/public/HospitalDepartmentsSection';
import HospitalMedicalCentersSection from '@/components/public/HospitalMedicalCentersSection';
import HospitalJourneySection from '@/components/public/HospitalJourneySection';
import HospitalNewsSection from '@/components/public/HospitalNewsSection';
import HospitalContactSection from '@/components/public/HospitalContactSection';

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

  // ─── تجهيز بيانات السيكشن 2: تجميع عيادات كل المراكز التابعة ───
  const clinics = (h.medicalCenters ?? []).flatMap((link: any) =>
    (link.medicalCenter?.clinics ?? []).map((c: any) => ({
      id: c.id,
      name: c.name,
      schedule: c.schedule,
      centerId: link.medicalCenter.id,
      centerName: link.medicalCenter.name,
    })),
  );

  // ─── تجهيز بيانات السيكشن 4 ───
  const centers = (h.medicalCenters ?? []).map((link: any) => link.medicalCenter).filter(Boolean);

  // ─── تجهيز بيانات السيكشن 6: أخبار المستشفى، وإلا أخبار عامة ───
  let posts: any[] = h.newsPosts ?? [];
  if (posts.length === 0) {
    const general = await getNewsPosts({ pageSize: 4 });
    posts = (general?.data ?? []).map((p: any) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      featuredImage: p.featuredImage ?? p.coverImage,
      publishedAt: p.publishedAt,
    }));
  }

  return (
    <PublicLayout>
      <PageTitle
        title={t(h.name)}
        breadcrumbs={[
          { label: 'المستشفيات', href: '/hospitals' },
          { label: t(h.name) },
        ]}
      />

      {/* 1 */}
      <HospitalHeroSection
        name={h.name}
        tagline={h.heroTagline}
        stats={h.heroStats}
        heroImage={h.heroImage}
        hospitalId={h.id}
        departments={h.departments}
      />

      {/* 2 */}
      <HospitalClinicsSection clinics={clinics} hospitalId={h.id} />

      {/* 3 */}
      <HospitalDepartmentsSection hospitalSlug={h.slug} departments={h.departments ?? []} />

      {/* 4 */}
      <HospitalMedicalCentersSection
        hospitalName={h.name}
        hospitalImage={h.heroImage}
        centers={centers as any}
      />

      {/* 5 */}
      <HospitalJourneySection steps={h.journeySteps} hospitalSlug={h.slug} hospitalId={h.id} />

      {/* 6 */}
      <HospitalNewsSection posts={posts} />

      {/* 7 */}
      <HospitalContactSection
        hospitalId={h.id}
        contactInfo={h.contactInfo}
        locations={h.locations}
        fallbackMapUrl={h.googleMapsUrl}
      />
    </PublicLayout>
  );
}
