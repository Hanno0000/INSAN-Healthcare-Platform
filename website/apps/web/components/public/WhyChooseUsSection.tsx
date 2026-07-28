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
              رعاية متعاطفة، <br className="hidden md:block" />طب متقدم
            </h2>
            <p className="text-lg text-default font-cairo leading-relaxed mb-6">
              لأكثر من عقدين من الزمان، كرسنا جهودنا لتقديم رعاية صحية استثنائية تجمع بين أحدث التقنيات الطبية واللمسة الشخصية التي يستحقها مرضانا.
            </p>
            <p className="text-default font-cairo leading-relaxed mb-8">
              يعمل فريقنا متعدد التخصصات من الخبراء بشكل تعاوني لضمان حصول كل مريض على رعاية شاملة مصممة خصيصًا لتلبية احتياجاته الفريدة. من الخدمات الوقائية إلى الإجراءات المعقدة، نحافظ على أعلى معايير التميز الطبي مع تعزيز بيئة من الثقة والشفاء.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10 font-montserrat border-y border-gray-100 py-8">
              <div className="stat-item text-center sm:text-right">
                <div className="text-4xl font-bold text-accent-500 mb-2">
                  <CountUp start={0} end={15000} duration={2} separator="," />+
                </div>
                <div className="text-sm text-default font-semibold font-cairo">مريض تم خدمته</div>
              </div>
              <div className="stat-item text-center sm:text-right">
                <div className="text-4xl font-bold text-accent-500 mb-2">
                  <CountUp start={0} end={25} duration={2} />+
                </div>
                <div className="text-sm text-default font-semibold font-cairo">سنوات من التميز</div>
              </div>
              <div className="stat-item text-center sm:text-right">
                <div className="text-4xl font-bold text-accent-500 mb-2">
                  <CountUp start={0} end={50} duration={2} />+
                </div>
                <div className="text-sm text-default font-semibold font-cairo">أخصائي طبي</div>
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
                <h4 className="font-bold text-heading text-lg mb-1">طوارئ 24/7</h4>
                <p className="text-default text-sm m-0">نحن دائماً هنا عندما تحتاج إلينا</p>
              </div>
            </div>
            
            <div className="experience-badge absolute top-10 -left-10 bg-primary text-white w-32 h-32 rounded-full flex flex-col items-center justify-center text-center shadow-floating z-20 border-4 border-white font-montserrat">
              <span className="text-3xl font-bold block mb-1">25+</span>
              <span className="text-xs font-cairo font-semibold px-2">عاماً من الرعاية الموثوقة</span>
            </div>

            {/* Background elements */}
            <div className="absolute top-0 right-0 w-full h-full bg-light-bg rounded-card -z-10 translate-x-4 translate-y-4"></div>
          </div>

        </div>
      </div>
    </section>
  );
}
