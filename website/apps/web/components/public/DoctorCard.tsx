import Link from 'next/link';
import type { Doctor } from '@/lib/public-api';
import { t, truncate } from '@/lib/utils';
import { Award, Star } from 'lucide-react';

export default function DoctorCard({ doctor }: { doctor: Doctor }) {
  // Try to use doctor's associated hospital/center color if available, or fallback
  const color = '#175cdd'; // Default accent
  
  return (
    <div className="doctor-profile bg-white rounded-card shadow-sm border border-gray-100 hover:shadow-floating transition-all duration-300 flex flex-col group h-full overflow-hidden" data-aos="zoom-in">
      <div className="profile-header p-6 flex items-start gap-4 flex-col sm:flex-row">
        <div className="doctor-avatar relative shrink-0">
          <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white shadow-md bg-gray-50">
            {doctor.photo ? (
              <img src={doctor.photo} alt={t(doctor.name)} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </div>
            )}
          </div>
          <div className="status-indicator absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-white bg-green-500"></div>
        </div>
        
        <div className="doctor-details">
          <h4 className="text-xl font-bold text-heading font-montserrat mb-1 group-hover:text-accent-500 transition-colors">{t(doctor.name)}</h4>
          <span className="specialty-tag inline-block bg-light-bg text-accent-500 text-xs font-semibold px-3 py-1 rounded-pill font-cairo mb-3">
            {t(doctor.specialty)}
          </span>
          <div className="experience-info flex items-center gap-2 text-default text-sm font-cairo mb-2">
            <Award className="w-4 h-4 text-gray-400" />
            <span>أكثر من 10 سنوات خبرة</span>
          </div>
          <p className="text-gray-500 text-sm font-cairo leading-relaxed line-clamp-2">
            {truncate(t(doctor.bio), 80)}
          </p>
        </div>
      </div>
      
      <div className="rating-section px-6 py-4 border-t border-gray-100 flex items-center gap-2 bg-gray-50/50">
        <div className="stars flex text-yellow-400">
          <Star className="w-4 h-4 fill-current" />
          <Star className="w-4 h-4 fill-current" />
          <Star className="w-4 h-4 fill-current" />
          <Star className="w-4 h-4 fill-current" />
          <Star className="w-4 h-4 fill-current" />
        </div>
        <span className="rating-score font-bold text-heading font-montserrat text-sm">5.0</span>
        <span className="review-count text-gray-400 text-xs font-cairo">(127 تقييم)</span>
      </div>
      
      <div className="action-buttons p-6 pt-0 mt-auto flex gap-3 flex-wrap sm:flex-nowrap">
        <Link href={`/doctors/${doctor.slug}`} className="flex-1 btn-secondary text-center py-2.5 rounded-pill border-2 border-gray-200 text-heading font-semibold hover:border-accent-500 hover:text-accent-500 transition-colors font-cairo text-sm">
          عرض التفاصيل
        </Link>
        <Link href="/book" className="flex-1 btn-primary text-center py-2.5 rounded-pill bg-accent-500 text-white font-semibold hover:bg-accent-600 shadow-sm hover:shadow transition-all font-cairo text-sm border-2 border-accent-500">
          احجز موعد
        </Link>
      </div>
    </div>
  );
}
