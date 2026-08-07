import SectionTitle from './SectionTitle';
import MedicalCenterCard from './MedicalCenterCard';
import { t } from '@/lib/utils';
import type { Bilingual, MedicalCenter } from '@/lib/public-api';
import { HeartPulse } from 'lucide-react';

interface Props {
  hospitalName: Bilingual;
  hospitalImage?: string;
  hospitalId: string;
  centers: MedicalCenter[];
}

export default function HospitalMedicalCentersSection({ hospitalName, hospitalImage, hospitalId, centers }: Props) {
  if (!centers || centers.length === 0) return null;

  return (
    <section className="py-20 lg:py-24 bg-white">
      <div className="container mx-auto px-4 md:px-8 max-w-7xl">
        <SectionTitle
          title="المراكز الطبية التابعة"
          subtitle="مراكز طبية متخصصة تابعة لهذا المستشفى"
          centered={true}
        />

        <div className="flex flex-col lg:flex-row gap-8 mt-12">

          {/* Main Feature Area — image stays on the left, per design decision */}
          {hospitalImage && (
            <div className="lg:w-7/12" data-aos="fade-right">
              <div className="featured-service-main relative rounded-card overflow-hidden group">
                <div className="service-image-wrapper relative aspect-[4/3] w-full overflow-hidden">
                  <img src={hospitalImage} alt={t(hospitalName)} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/90 to-transparent"></div>
                  <div className="absolute top-6 left-6">
                    <div className="service-badge bg-white/20 backdrop-blur-md px-4 py-2 rounded-pill flex items-center gap-2 text-white font-cairo text-sm font-semibold border border-white/30">
                      <HeartPulse className="w-4 h-4" />
                      <span>رعاية شاملة</span>
                    </div>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 w-full p-8 md:p-10">
                  <h2 className="text-2xl md:text-3xl font-bold text-white font-montserrat mb-3 leading-tight">{t(hospitalName)}</h2>
                </div>
              </div>
            </div>
          )}

          {/* Centers Sidebar */}
          <div className={`${hospitalImage ? 'lg:w-5/12' : 'w-full'} flex flex-col gap-4`} data-aos="fade-left">
            {centers.slice(0, 4).map((center) => (
              <MedicalCenterCard key={center.id} center={center} />
            ))}

            {centers.length > 4 && (
              <div className="mt-4 flex justify-center">
                <a
                  href={`/medical-centers?hospitalId=${hospitalId}`}
                  className="btn btn-outline-primary border-2 border-primary text-primary hover:bg-primary hover:text-white px-8 py-3 rounded-pill font-cairo font-semibold transition-all w-full text-center"
                >
                  تصفح جميع المراكز
                </a>
              </div>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}
