'use client';

import Link from 'next/link';
import { Calendar } from 'lucide-react';
import CountUp from 'react-countup';
import { t } from '@/lib/utils';
import type { Bilingual, HeroStat } from '@/lib/public-api';

interface Props {
  name: Bilingual;
  tagline?: Bilingual;
  stats?: HeroStat[];
  heroImage?: string;
  hospitalId: string;
}

export default function HospitalHeroSection({ name, tagline, stats, heroImage, hospitalId }: Props) {
  return (
    <section id="hero" className="relative bg-light-bg py-20 lg:py-32 overflow-hidden w-full">
      <div className="container mx-auto px-4 md:px-8 max-w-7xl">
        <div className={`grid grid-cols-1 ${heroImage ? 'lg:grid-cols-2' : ''} gap-12 items-center`}>

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

          {/* Right Visual */}
          {heroImage && (
            <div className="hero-visual relative z-10" data-aos="fade-right">
              <div className="main-image relative rounded-card overflow-hidden shadow-floating">
                <img src={heroImage} alt={t(name)} className="w-full h-auto object-cover aspect-[4/3]" />
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-accent-500/5 rounded-full blur-3xl -z-10"></div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
