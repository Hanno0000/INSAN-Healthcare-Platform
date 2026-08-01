import Link from 'next/link';
import type { MedicalCenter } from '@/lib/public-api';
import { t, truncate } from '@/lib/utils';
import { Activity, ArrowRight } from 'lucide-react';

export default function MedicalCenterCard({ center }: { center: MedicalCenter }) {
  const color = center.brandColor || '#0E7C86'; // secondary color
  
  return (
    <div className="service-item bg-white p-6 rounded-card border border-gray-100 shadow-sm hover:shadow-floating transition-all duration-300 flex items-start gap-4 group" data-aos="fade-up">
      <div className="service-icon-wrapper w-14 h-14 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 group-hover:bg-accent-500 group-hover:text-white" style={{ backgroundColor: `${color}15`, color: color }}>
        {center.logoUrl ? (
           <img src={center.logoUrl} alt="" className="w-8 h-8 object-contain" />
        ) : (
           <Activity className="w-6 h-6" />
        )}
      </div>
      <div className="service-info flex-1">
        <h4 className="text-lg font-bold text-heading font-montserrat mb-2 group-hover:text-accent-500 transition-colors">{t(center.name)}</h4>
        <p className="text-default font-cairo text-sm leading-relaxed mb-3">
          {truncate(t(center.shortDescription), 80)}
        </p>
        <Link href={`/medical-centers/${center.slug}`} className="service-link inline-flex items-center gap-1 text-sm font-bold text-heading hover:text-accent-500 transition-colors font-cairo">
          اعرف المزيد <ArrowRight className="w-3 h-3 rtl:rotate-180" />
        </Link>
      </div>
    </div>
  );
}
