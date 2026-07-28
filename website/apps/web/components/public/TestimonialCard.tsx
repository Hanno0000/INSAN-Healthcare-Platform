import type { Testimonial } from '@/lib/public-api';
import { t } from '@/lib/utils';
import { Quote } from 'lucide-react';

const AUDIENCE_LABEL: Record<string, string> = {
  PATIENT: 'مريض',
  DOCTOR: 'طبيب',
  PARTNER: 'شريك',
};

export default function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <div className="bg-white/10 backdrop-blur-md rounded-card p-8 flex flex-col gap-6 border border-white/20 hover:bg-white/20 hover:-translate-y-2 transition-all duration-300" data-aos="fade-up">
      {/* Quote mark */}
      <Quote className="w-10 h-10 text-secondary-500 opacity-50" />

      <p className="text-white/90 text-base leading-relaxed flex-1 font-cairo italic">
        "{t(testimonial.quote)}"
      </p>

      {/* Author */}
      <div className="flex items-center gap-4 mt-2">
        {testimonial.photo ? (
          <img src={testimonial.photo} alt={t(testimonial.name)} className="w-12 h-12 rounded-full object-cover border-2 border-white/30" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-secondary-500 flex items-center justify-center border-2 border-white/30">
            <span className="text-white font-bold text-lg font-montserrat">{t(testimonial.name).charAt(0)}</span>
          </div>
        )}
        <div className="font-cairo">
          <p className="text-white font-bold text-base">{t(testimonial.name)}</p>
          <p className="text-secondary-100 text-sm">{AUDIENCE_LABEL[testimonial.audience] || testimonial.audience}</p>
        </div>
      </div>
    </div>
  );
}
