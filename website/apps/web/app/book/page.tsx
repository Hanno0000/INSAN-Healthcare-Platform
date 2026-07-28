import type { Metadata } from 'next';
import PublicLayout from '@/components/public/PublicLayout';
import PageTitle from '@/components/public/PageTitle';
import AppointmentForm from '@/components/public/AppointmentForm';
import { getHospitals, getMedicalCenters, getDoctors } from '@/lib/public-api';

export const metadata: Metadata = {
  title: 'حجز موعد | منظومة إنسان',
  description: 'احجز موعدك مع أفضل الأطباء في منظومة إنسان',
};

interface Props {
  searchParams: { hospitalId?: string; medicalCenterId?: string; doctorId?: string };
}

export default async function BookPage({ searchParams }: Props) {
  const [hospitals, centers, doctors] = await Promise.all([
    getHospitals({ pageSize: 50 }),
    getMedicalCenters({ pageSize: 50 }),
    getDoctors({ pageSize: 50 }),
  ]);

  return (
    <PublicLayout>
      <PageTitle 
        title="احجز موعدك" 
        breadcrumbs={[{ label: 'حجز موعد' }]} 
      />

      <section className="py-20 bg-light-bg relative">
        {/* Decorative background shapes */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="container mx-auto px-4 md:px-8 max-w-3xl relative z-10">
          <div className="bg-white rounded-card shadow-floating border border-gray-100 p-8 md:p-12" data-aos="fade-up">
            
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-heading font-montserrat mb-3">نموذج الحجز</h2>
              <p className="text-default font-cairo text-sm md:text-base">
                يرجى ملء البيانات التالية وسيقوم فريقنا بالتواصل معك لتأكيد الموعد في أقرب وقت.
              </p>
            </div>

            <AppointmentForm
              hospitals={hospitals?.data ?? []}
              centers={centers?.data ?? []}
              doctors={doctors?.data ?? []}
              defaultHospitalId={searchParams.hospitalId}
              defaultCenterId={searchParams.medicalCenterId}
              defaultDoctorId={searchParams.doctorId}
            />
            
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
