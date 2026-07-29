'use client';

import SectionTitle from './SectionTitle';
import { t } from '@/lib/utils';
import type { JourneyStep } from '@/lib/public-api';
import { Search, Calendar, Stethoscope, Smile, Heart, Shield, Users, Activity } from 'lucide-react';
import Link from 'next/link';

const ICONS: Record<string, any> = {
  search: Search,
  calendar: Calendar,
  stethoscope: Stethoscope,
  smile: Smile,
  heart: Heart,
  shield: Shield,
  users: Users,
  activity: Activity,
};

const DEFAULT_STEPS: JourneyStep[] = [
  {
    icon: 'search',
    image: '/images/journey/find-doctor.png',
    title: { ar: 'ابحث عن طبيبك', en: 'Find your doctor' },
    desc: { ar: 'تصفح قائمة أطبائنا المتخصصين واقرأ التقييمات لاختيار الأنسب لك.', en: '' },
  },
  {
    icon: 'calendar',
    image: '/images/journey/book-appointment.png',
    title: { ar: 'احجز موعدك', en: 'Book your appointment' },
    desc: { ar: 'اختر الوقت المناسب لك واحجز موعدك بكل سهولة عبر منصتنا الإلكترونية.', en: '' },
  },
  {
    icon: 'stethoscope',
    image: '/images/journey/receive-care.png',
    title: { ar: 'تلقى الرعاية', en: 'Receive care' },
    desc: { ar: 'احصل على رعاية طبية متميزة في مستشفياتنا أو مراكزنا الطبية المتخصصة.', en: '' },
  },
  {
    icon: 'smile',
    image: '/images/journey/recover-peace.png',
    title: { ar: 'تعافى بسلام', en: 'Recover in peace' },
    desc: { ar: 'نتابع معك خطة العلاج خطوة بخطوة لضمان تعافيك التام وعودتك لحياتك.', en: '' },
  },
];

interface Props {
  steps?: JourneyStep[];
  hospitalSlug?: string;
  hospitalId?: string;
}

export default function HospitalJourneySection({ steps, hospitalSlug, hospitalId }: Props) {
  // If steps exist but are empty (from bad save), fallback to DEFAULT_STEPS
  const effectiveSteps = steps && steps.length > 0 && steps[0]?.title?.ar ? steps : DEFAULT_STEPS;

  // Compute links per step
  const getStepLink = (index: number, stepLink?: string) => {
    if (stepLink) return stepLink;
    if (index === 0) return hospitalSlug ? `/hospitals/${hospitalSlug}#departments` : '/doctors';
    if (index === 1) return hospitalId ? `/book?hospitalId=${hospitalId}` : '/book';
    if (index === 2) return hospitalSlug ? `/hospitals/${hospitalSlug}` : '/hospitals';
    return undefined; // no link for step 4 by default
  };

  return (
    <section className="py-20 lg:py-24 bg-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-light-bg/50 to-transparent -z-10"></div>

      <div className="container mx-auto px-4 md:px-8 max-w-7xl">
        <SectionTitle
          title="رحلة المريض معنا"
          subtitle="خطوات بسيطة تفصلك عن الحصول على أفضل رعاية صحية ممكنة"
          centered={true}
        />

        <div className="mt-16 relative">
          <div className="hidden lg:block absolute top-12 left-[10%] right-[10%] h-0.5 bg-gray-100 -z-10">
            <div className="absolute top-0 right-0 h-full bg-accent-500 w-full opacity-30"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-6">
            {effectiveSteps.map((step, index) => {
              const Icon = ICONS[step.icon] ?? Search;
              const link = getStepLink(index, step.link);
              const imgUrl = step.image || DEFAULT_STEPS[index]?.image;

              const CardContent = (
                <div className={`relative group ${link ? 'cursor-pointer' : ''}`} data-aos="fade-up" data-aos-delay={index * 100}>
                  <div className="absolute -top-6 -right-4 text-7xl font-bold text-gray-50/80 font-montserrat -z-10 transition-transform duration-500 group-hover:scale-110">
                    0{index + 1}
                  </div>

                  <div className="flex flex-col items-center text-center">
                    <div className="w-24 h-24 rounded-full bg-white border-4 border-gray-50 flex items-center justify-center text-accent-500 mb-6 shadow-floating overflow-hidden group-hover:border-accent-500 group-hover:shadow-lg transition-all duration-300 relative z-10">
                      {imgUrl ? (
                        <img src={imgUrl} alt={t(step.title)} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      ) : (
                        <Icon className="w-8 h-8 group-hover:scale-110 transition-transform" />
                      )}
                    </div>

                    <h4 className="text-xl font-bold text-heading font-montserrat mb-3 transition-colors group-hover:text-accent-500">{t(step.title)}</h4>
                    <p className="text-default font-cairo text-sm leading-relaxed max-w-[250px] mx-auto">
                      {t(step.desc)}
                    </p>
                  </div>
                </div>
              );

              return link ? (
                <Link href={link} key={index} className="block outline-none">
                  {CardContent}
                </Link>
              ) : (
                <div key={index}>{CardContent}</div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
