import type { Testimonial } from '@/lib/public-api';
import { t } from '@/lib/utils';

const AUDIENCE_LABEL: Record<string, string> = {
  PATIENT: 'مريض',
  DOCTOR: 'طبيب',
  PARTNER: 'شريك',
};

export default function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <div className="bg-white/10 backdrop-blur rounded-2xl p-6 flex flex-col gap-4 border border-white/10">
      {/* Quote mark */}
      <svg className="w-8 h-8 text-secondary-500 opacity-80" fill="currentColor" viewBox="0 0 24 24">
        <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
      </svg>

      <p className="text-white/90 text-sm leading-relaxed flex-1">
        {t(testimonial.quote)}
      </p>

      {/* Author */}
      <div className="flex items-center gap-3 mt-2">
        {testimonial.photo ? (
          <img src={testimonial.photo} alt={t(testimonial.name)} className="w-10 h-10 rounded-full object-cover border border-white/20" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-white font-bold text-sm">{t(testimonial.name).charAt(0)}</span>
          </div>
        )}
        <div>
          <p className="text-white font-semibold text-sm">{t(testimonial.name)}</p>
          <p className="text-white/50 text-xs">{AUDIENCE_LABEL[testimonial.audience] || testimonial.audience}</p>
        </div>
      </div>
    </div>
  );
}
