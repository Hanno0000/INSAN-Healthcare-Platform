import type { Metadata } from 'next';
import PublicLayout from '@/components/public/PublicLayout';
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
      {/* Header */}
      <section className="bg-primary-900 text-white py-14">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">احجز موعدك</h1>
          <p className="text-white/70 text-lg">
            اختر المستشفى والطبيب المناسب وسنتواصل معك لتأكيد الموعد.
          </p>
        </div>
      </section>

      <section className="py-12 bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <AppointmentForm
            hospitals={hospitals?.data ?? []}
            centers={centers?.data ?? []}
            doctors={doctors?.data ?? []}
            defaultHospitalId={searchParams.hospitalId}
            defaultCenterId={searchParams.medicalCenterId}
            defaultDoctorId={searchParams.doctorId}
          />
        </div>
      </section>
    </PublicLayout>
  );
}
