import type { Metadata } from 'next';
import PublicLayout from '@/components/public/PublicLayout';
import HeroSection from '@/components/public/HeroSection';
import WhyChooseUsSection from '@/components/public/WhyChooseUsSection';
import HospitalsSection from '@/components/public/HospitalsSection';
import FeaturedServicesSection from '@/components/public/FeaturedServicesSection';
import ProgramsSection from '@/components/public/ProgramsSection';
import DoctorsSection from '@/components/public/DoctorsSection';
import PatientJourneySection from '@/components/public/PatientJourneySection';
import LatestNewsSection from '@/components/public/LatestNewsSection';
import HomeContactSection from '@/components/public/HomeContactSection';
import {
  getHospitals, getMedicalCenters, getDoctors,
  getNewsPosts, getTestimonials,
} from '@/lib/public-api';

export const metadata: Metadata = {
  title: 'منظومة إنسان للرعاية الصحية',
  description: 'المنظومة الصحية المتكاملة — نربط المرضى بأفضل الكفاءات الطبية في مصر',
};

export default async function HomePage() {
  const [hospitals, centers, programs, doctors, news] = await Promise.all([
    getHospitals({ pageSize: 4 }),
    getMedicalCenters({ pageSize: 6 }),
    getMedicalCenters({ pageSize: 6, type: 'PROGRAM' }),
    getDoctors({ pageSize: 6 }),
    getNewsPosts({ pageSize: 4 }),
  ]);

  return (
    <PublicLayout>
      <HeroSection />
      <WhyChooseUsSection />
      <HospitalsSection hospitals={hospitals?.data || []} />
      <FeaturedServicesSection centers={centers?.data || []} />
      <ProgramsSection programs={programs?.data || []} />
      <DoctorsSection doctors={doctors?.data || []} />
      <PatientJourneySection />
      <LatestNewsSection news={news?.data || []} />
      <HomeContactSection />
    </PublicLayout>
  );
}
