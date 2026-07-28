import Link from 'next/link';
import SectionTitle from './SectionTitle';
import { t } from '@/lib/utils';
import type { Bilingual } from '@/lib/public-api';

interface ClinicItem {
  id: string;
  name: Bilingual;
  schedule: any;
  centerId: string;
  centerName: Bilingual;
}

interface Props {
  clinics: ClinicItem[];
  hospitalId: string;
}

function renderSchedule(schedule: any) {
  if (!schedule) return null;
  if (typeof schedule === 'string') return <p>{schedule}</p>;
  if (Array.isArray(schedule)) {
    return schedule.map((s: any, i: number) => (
      <p key={i}>{typeof s === 'string' ? s : JSON.stringify(s)}</p>
    ));
  }
  return Object.entries(schedule).map(([k, v]) => (
    <p key={k}><span className="font-semibold">{k}:</span> {String(v)}</p>
  ));
}

export default function HospitalClinicsSection({ clinics, hospitalId }: Props) {
  if (!clinics || clinics.length === 0) return null;

  return (
    <section className="py-20 bg-light-bg">
      <div className="container mx-auto px-4 md:px-8 max-w-7xl">
        <SectionTitle
          title="العيادات الخارجية التابعة للمستشفى"
          subtitle="اختر العيادة المناسبة واحجز موعدك"
          centered={true}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          {clinics.map((clinic) => (
            <div key={clinic.id} className="bg-white rounded-card p-6 border border-gray-100 shadow-sm hover:shadow-card-hover transition-all">
              <h4 className="text-lg font-bold text-heading font-montserrat mb-2">{t(clinic.name)}</h4>
              <p className="text-sm text-gray-500 font-cairo mb-4">{t(clinic.centerName)}</p>

              {clinic.schedule && (
                <div className="text-sm text-default font-cairo space-y-1 mb-5">
                  {renderSchedule(clinic.schedule)}
                </div>
              )}

              <Link
                href={`/book?medicalCenterId=${clinic.centerId}&hospitalId=${hospitalId}`}
                className="block text-center w-full bg-accent-500 hover:bg-accent-600 text-white font-bold py-3 rounded-pill transition-all font-cairo"
              >
                احجز موعد
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
