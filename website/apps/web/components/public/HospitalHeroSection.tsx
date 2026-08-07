'use client';

import Link from 'next/link';
import { Calendar } from 'lucide-react';
import CountUp from 'react-countup';
import { t } from '@/lib/utils';
import type { Bilingual, HeroStat } from '@/lib/public-api';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-fade';
import 'swiper/css/pagination';

interface Props {
  name: Bilingual;
  tagline?: Bilingual;
  stats?: HeroStat[];
  heroImage?: string;
  heroImages?: string[];
  hospitalId: string;
  departments?: any[];
}

export default function HospitalHeroSection({ name, tagline, stats, heroImage, heroImages = [], hospitalId, departments = [] }: Props) {
  // Collect images for the slideshow
  const slideImages = [...(heroImages || [])];
  if (heroImage && !slideImages.includes(heroImage)) slideImages.push(heroImage);
  departments.forEach(d => {
    if (d.image && !slideImages.includes(d.image)) slideImages.push(d.image);
  });

  return (
    <section id="hero" className="relative bg-light-bg py-20 lg:py-32 overflow-hidden w-full">
      <div className="container mx-auto px-4 md:px-8 max-w-7xl">
        <div className={`grid grid-cols-1 ${slideImages.length > 0 ? 'lg:grid-cols-2' : ''} gap-12 items-center`}>

          {/* Left Content */}
          <div className="hero-content space-y-6 z-10" data-aos="fade-left">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-heading leading-tight font-montserrat">
              {t(name)}
            </h1>

            {tagline && t(tagline) && (
              <p className="hero-description text-lg text-default leading-relaxed font-cairo max-w-xl">
                {t(tagline)}
              </p>
            )}

            {stats && stats.length > 0 && (
              <div className="hero-stats flex flex-wrap gap-8 py-6 font-montserrat">
                {stats.map((stat, i) => (
                  <div className="stat-item" key={i}>
                    <h3 className="text-3xl font-bold text-heading">
                      <CountUp start={0} end={Number(stat.value) || 0} duration={2} />{stat.suffix}
                    </h3>
                    <p className="text-default font-cairo text-sm mt-1">{t(stat.label)}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="hero-actions flex flex-wrap gap-4 items-center font-cairo">
              <Link href={`/book?hospitalId=${hospitalId}`} className="btn btn-primary bg-accent-500 hover:bg-accent-600 text-white font-semibold px-8 py-3.5 rounded-pill shadow-card-hover transition-all flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                احجز موعدك
              </Link>
            </div>
          </div>

          {/* Right Visual (Slideshow) */}
          {slideImages.length > 0 && (
            <div className="hero-visual relative z-10" data-aos="fade-right">
              <div className="main-image relative rounded-card overflow-hidden shadow-floating aspect-[4/3]">
                <Swiper
                  modules={[Autoplay, EffectFade, Pagination]}
                  effect="fade"
                  autoplay={{ delay: 3500, disableOnInteraction: false }}
                  pagination={{ clickable: true }}
                  loop={slideImages.length > 1}
                  className="w-full h-full"
                >
                  {slideImages.map((img, idx) => (
                    <SwiperSlide key={idx}>
                      <img src={img} alt={`${t(name)} - ${idx}`} className="w-full h-full object-cover" />
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-accent-500/5 rounded-full blur-3xl -z-10"></div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
