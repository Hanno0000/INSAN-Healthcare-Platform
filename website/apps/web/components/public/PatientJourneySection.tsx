'use client';

import React from 'react';
import SectionTitle from './SectionTitle';
import { Search, Calendar, Stethoscope, Smile } from 'lucide-react';
import Link from 'next/link';

export default function PatientJourneySection() {
  const steps = [
    {
      id: 1,
      icon: <Search className="w-8 h-8 group-hover:scale-110 transition-transform" />,
      image: '/images/journey/find-doctor.png',
      title: 'ابحث عن طبيبك',
      desc: 'تصفح قائمة أطبائنا المتخصصين واقرأ التقييمات لاختيار الأنسب لك.',
      link: '/doctors'
    },
    {
      id: 2,
      icon: <Calendar className="w-8 h-8 group-hover:scale-110 transition-transform" />,
      image: '/images/journey/book-appointment.png',
      title: 'احجز موعدك',
      desc: 'اختر الوقت المناسب لك واحجز موعدك بكل سهولة عبر منصتنا الإلكترونية.',
      link: '/book'
    },
    {
      id: 3,
      icon: <Stethoscope className="w-8 h-8 group-hover:scale-110 transition-transform" />,
      image: '/images/journey/receive-care.png',
      title: 'تلقى الرعاية',
      desc: 'احصل على رعاية طبية متميزة في مستشفياتنا أو مراكزنا الطبية المتخصصة.',
      link: '/hospitals'
    },
    {
      id: 4,
      icon: <Smile className="w-8 h-8 group-hover:scale-110 transition-transform" />,
      image: '/images/journey/recover-peace.png',
      title: 'تعافى بسلام',
      desc: 'نتابع معك خطة العلاج خطوة بخطوة لضمان تعافيك التام وعودتك لحياتك.',
      link: undefined
    }
  ];

  return (
    <section className="py-20 lg:py-24 bg-white relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-light-bg/50 to-transparent -z-10"></div>
      
      <div className="container mx-auto px-4 md:px-8 max-w-7xl">
        <SectionTitle
          title="رحلة المريض معنا"
          subtitle="خطوات بسيطة تفصلك عن الحصول على أفضل رعاية صحية ممكنة"
          centered={true}
        />

        <div className="mt-16 relative">
          {/* Connector Line (Desktop) */}
          <div className="hidden lg:block absolute top-12 left-[10%] right-[10%] h-0.5 bg-gray-100 -z-10">
            <div className="absolute top-0 right-0 h-full bg-accent-500 w-full opacity-30"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-6">
            {steps.map((step, index) => {
              const CardContent = (
                <div className={`relative group ${step.link ? 'cursor-pointer' : ''}`} data-aos="fade-up" data-aos-delay={index * 100}>
                  
                  {/* Step Number */}
                  <div className="absolute -top-6 -right-4 text-7xl font-bold text-gray-50/80 font-montserrat -z-10 transition-transform duration-500 group-hover:scale-110">
                    0{step.id}
                  </div>

                  <div className="flex flex-col items-center text-center">
                    <div className="w-24 h-24 rounded-full bg-white border-4 border-gray-50 flex items-center justify-center text-accent-500 mb-6 shadow-floating overflow-hidden group-hover:border-accent-500 group-hover:shadow-lg transition-all duration-300 relative z-10">
                      {step.image ? (
                        <img src={step.image} alt={step.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      ) : (
                        step.icon
                      )}
                    </div>
                    
                    <h4 className="text-xl font-bold text-heading font-montserrat mb-3 transition-colors group-hover:text-accent-500">{step.title}</h4>
                    <p className="text-default font-cairo text-sm leading-relaxed max-w-[250px] mx-auto">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );

              return step.link ? (
                <Link href={step.link} key={step.id} className="block outline-none">
                  {CardContent}
                </Link>
              ) : (
                <div key={step.id}>{CardContent}</div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
