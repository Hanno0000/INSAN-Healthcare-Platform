import Link from 'next/link';
import type { Hospital } from '@/lib/public-api';
import { t, truncate } from '@/lib/utils';
import { ShieldPlus, ArrowRight } from 'lucide-react';

export default function HospitalCard({ hospital }: { hospital: Hospital }) {
  const color = hospital.brandColor || '#175cdd'; // Fallback to accent color
  
  return (
    <div className="department-highlight bg-white rounded-card border border-gray-100 hover:border-transparent hover:shadow-floating transition-all duration-300 h-full flex flex-col group relative overflow-hidden" data-aos="fade-up">
      {/* Top accent line */}
      <div className="absolute top-0 left-0 w-full h-1 z-10" style={{ backgroundColor: color }} />
      
      {/* Cover Image / Thumbnail */}
      <div className="w-full aspect-[4/3] md:aspect-video bg-gray-100 relative overflow-hidden">
        {hospital.heroImage ? (
          <img src={hospital.heroImage} alt={t(hospital.name)} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300">
            <ShieldPlus className="w-12 h-12" />
          </div>
        )}
        
        {/* Logo overlay */}
        {hospital.logoUrl && (
          <div className="absolute bottom-4 right-4 w-16 h-16 bg-white rounded-full p-2 shadow-sm border border-gray-50 flex items-center justify-center">
            <img src={hospital.logoUrl} alt="" className="w-full h-full object-contain" />
          </div>
        )}
      </div>
      
      <div className="p-8 flex-1 flex flex-col">
        <h4 className="text-xl font-bold text-heading font-montserrat mb-3">{t(hospital.name)}</h4>
        
        <p className="text-default font-cairo mb-6 flex-1 text-sm leading-relaxed">
          {truncate(t(hospital.shortDescription), 120)}
        </p>
        
        <Link href={`/hospitals/${hospital.slug}`} className="highlight-cta inline-flex items-center gap-2 font-bold font-cairo transition-colors mt-auto" style={{ color: color }}>
          اكتشف المستشفى <ArrowRight className="w-4 h-4 rtl:rotate-180" />
        </Link>
      </div>
    </div>
  );
}
