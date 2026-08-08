'use client';

import Link from 'next/link';
import CountUp from 'react-countup';
import { HeartPulse } from 'lucide-react';

export default function WhyChooseUsSection() {
  return (
    <section id="home-about" className="py-20 lg:py-24 bg-white overflow-hidden">
      <div className="container mx-auto px-4 md:px-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Content */}
          <div className="about-content" data-aos="fade-right">
            <h2 className="text-3xl md:text-4xl font-bold text-heading font-montserrat mb-6 leading-tight">
              لماذا تختار <br className="hidden md:block" /><span className="text-accent-500">منظومة إنسان؟</span>
            </h2>
            <p className="text-lg text-default font-cairo leading-relaxed mb-6">
              نحن لا نؤمن بأن الرعاية الصحية تقتصر على "عيادات متفرقة" أو خدمات طبية منعزلة، بل يجب أن تكون مظلة متكاملة تحيط بالمريض في كل خطواته.
            </p>
            <p className="text-default font-cairo leading-relaxed mb-8">
              في إنسان، قمنا بتحويل الأقسام الطبية التقليدية إلى <strong>مراكز طبية تخصصية (Centers of Excellence)</strong>، لضمان حصولك على أقصى درجات التميز والدقة. نظامنا المتكامل (Ecosystem) يضمن لك انتقالاً سلساً بين التشخيص في العيادات الخارجية وتلقي العلاج في المراكز المتقدمة دون الشعور بالانفصال.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10 font-montserrat border-y border-gray-100 py-8">
              <div className="stat-item text-center sm:text-right">
                <div className="text-4xl font-bold text-accent-500 mb-2">
                  <CountUp start={0} end={12} duration={2} />+
                </div>
                <div className="text-sm text-default font-semibold font-cairo">مركز طبي متخصص</div>
              </div>
              <div className="stat-item text-center sm:text-right">
                <div className="text-4xl font-bold text-accent-500 mb-2">
                  <CountUp start={0} end={100} duration={2} />%
                </div>
                <div className="text-sm text-default font-semibold font-cairo">رعاية متمركزة حول الإنسان</div>
              </div>
              <div className="stat-item text-center sm:text-right">
                <div className="text-4xl font-bold text-accent-500 mb-2">
                  <CountUp start={0} end={2} duration={2} />
                </div>
                <div className="text-sm text-default font-semibold font-cairo">مستشفيات كبرى مدمجة</div>
              </div>
            </div>

            <div className="cta-section">
              <Link href="/about" className="inline-block bg-accent-500 hover:bg-accent-600 text-white font-semibold px-8 py-3.5 rounded-pill shadow-card-hover transition-all font-cairo">
                اكتشف المزيد عنا
              </Link>
            </div>
          </div>

          {/* Right Visual */}
          <div className="about-visual relative" data-aos="fade-left">
            <div className="main-image relative rounded-card overflow-hidden shadow-floating border-4 border-white z-10">
              <img src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=1000&auto=format&fit=crop" alt="منشأة طبية حديثة" className="w-full h-auto object-cover aspect-square md:aspect-[4/5]" />
            </div>
            
            <div className="floating-card absolute -bottom-8 -right-8 bg-white p-6 rounded-card shadow-floating z-20 flex items-start gap-4 max-w-xs animate-[bounce_4s_infinite]">
              <div className="icon w-12 h-12 rounded-full bg-accent-500 text-white flex items-center justify-center shrink-0">
                <HeartPulse className="w-6 h-6" />
              </div>
              <div className="card-text font-cairo">
                <h4 className="font-bold text-heading text-lg mb-1">مركز الاستجابة السريعة</h4>
                <p className="text-default text-sm m-0">نبيع دقيقة أمان وجاهزية على مدار الساعة</p>
              </div>
            </div>
            
            {/* Cropped to just the shield mark: the source PNG is a wide
                4267×1916 lockup (icon + "إنسان" + English tagline), so a
                fixed-height image wider than this circle, left-aligned and
                clipped by overflow-hidden, shows only the icon on the left —
                explicit `left-0` rather than relying on default alignment,
                since that would flip under the site's RTL direction. */}
            <div className="experience-badge absolute top-10 -left-10 overflow-hidden bg-white w-32 h-32 rounded-full shadow-floating z-20 border-4 border-white">
              <img
                src="/logos/insan-logo-color.png"
                alt="إنسان"
                className="absolute left-0 top-1/2 -translate-y-1/2 h-24 w-auto max-w-none object-contain"
              />
            </div>

            {/* Background elements */}
            <div className="absolute top-0 right-0 w-full h-full bg-light-bg rounded-card -z-10 translate-x-4 translate-y-4"></div>
          </div>

        </div>
      </div>
    </section>
  );
}
