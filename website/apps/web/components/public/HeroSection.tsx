'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, Clock, Heart, HandHeart } from 'lucide-react';
import CountUp from 'react-countup';

export default function HeroSection() {
  return (
    <section id="hero" className="relative bg-light-bg py-20 lg:py-32 overflow-hidden w-full">
      <div className="container mx-auto px-4 md:px-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Content */}
          <div className="hero-content space-y-6 z-10" data-aos="fade-left">
            <div className="trust-badges flex flex-wrap gap-4 mb-4">
              <div className="badge-item flex items-center gap-2 bg-white px-4 py-2 rounded-pill shadow-sm text-sm font-semibold text-heading font-cairo">
                <ShieldCheck className="w-4 h-4 text-accent-500" />
                <span>معتمد رسمياً</span>
              </div>
              <div className="badge-item flex items-center gap-2 bg-white px-4 py-2 rounded-pill shadow-sm text-sm font-semibold text-heading font-cairo">
                <Clock className="w-4 h-4 text-accent-500" />
                <span>طوارئ 24/7</span>
              </div>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-heading leading-tight font-montserrat">
              التميز في <span className="text-accent-500">الرعاية الصحية</span> بروح إنسانية
            </h1>

            <p className="hero-description text-lg text-default leading-relaxed font-cairo max-w-xl">
              منظومة إنسان تجمع أفضل المستشفيات والمراكز الطبية والأطباء تحت سقف واحد —
              نقدم رعاية صحية استثنائية تجمع بين التكنولوجيا الطبية المتقدمة واللمسة الإنسانية التي تستحقها.
            </p>

            <div className="hero-stats flex flex-wrap gap-8 py-6 font-montserrat">
              <div className="stat-item">
                <h3 className="text-3xl font-bold text-heading">
                  <CountUp start={0} end={15} duration={2} />+
                </h3>
                <p className="text-default font-cairo text-sm mt-1">سنوات من الخبرة</p>
              </div>
              <div className="stat-item">
                <h3 className="text-3xl font-bold text-heading">
                  <CountUp start={0} end={12930} duration={2} />+
                </h3>
                <p className="text-default font-cairo text-sm mt-1">مريض تمت معالجته</p>
              </div>
              <div className="stat-item">
                <h3 className="text-3xl font-bold text-heading">
                  <CountUp start={0} end={50} duration={2} />+
                </h3>
                <p className="text-default font-cairo text-sm mt-1">خبير طبي</p>
              </div>
            </div>

            <div className="hero-actions flex flex-wrap gap-4 items-center font-cairo">
              <Link href="/book" className="btn btn-primary bg-accent-500 hover:bg-accent-600 text-white font-semibold px-8 py-3.5 rounded-pill shadow-card-hover transition-all">
                احجز موعدك
              </Link>
              <Link href="/doctors" className="btn btn-outline flex items-center gap-2 border-2 border-accent-500 text-accent-500 hover:bg-accent-500 hover:text-white font-semibold px-6 py-3 rounded-pill transition-all">
                ابحث عن طبيبك
              </Link>
            </div>
          </div>

          {/* Right Visual */}
          <div className="hero-visual relative z-10" data-aos="fade-right">
            <div className="main-image relative rounded-card overflow-hidden shadow-floating">
              <img src="https://images.unsplash.com/photo-1551076805-e1869033e561?q=80&w=1000&auto=format&fit=crop" alt="منشأة رعاية صحية حديثة" className="w-full h-auto object-cover aspect-[4/3]" />
              
              <div className="floating-card appointment-card absolute top-10 -right-6 md:-right-12 bg-white p-4 rounded-card shadow-floating flex items-center gap-4 animate-[bounce_3s_infinite] max-w-[220px]">
                <div className="card-icon w-12 h-12 rounded-full bg-accent-500/10 text-accent-500 flex items-center justify-center shrink-0">
                  <HandHeart className="w-6 h-6" />
                </div>
                <div className="card-content font-cairo">
                  <h6 className="font-bold text-heading text-sm m-0">الرعاية الضرورية فقط</h6>
                  <p className="text-default text-xs">لا نقترح أبداً إجراءً لا تحتاجه</p>
                </div>
              </div>

              <div className="floating-card rating-card absolute bottom-10 -left-6 md:-left-12 bg-white p-4 rounded-card shadow-floating animate-[bounce_4s_infinite] max-w-[220px]">
                <div className="card-content font-cairo flex items-center gap-3">
                  <div className="card-icon w-12 h-12 rounded-full bg-accent-500/10 text-accent-500 flex items-center justify-center shrink-0">
                    <Heart className="w-6 h-6" />
                  </div>
                  <div>
                    <h6 className="font-bold text-heading text-sm m-0">أساس الخدمة الطبية</h6>
                    <small className="text-default text-xs">احترام الإنسان</small>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Background decorative elements */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-accent-500/5 rounded-full blur-3xl -z-10"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
