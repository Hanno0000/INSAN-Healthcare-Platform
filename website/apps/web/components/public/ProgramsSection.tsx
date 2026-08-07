'use client';

import React from 'react';
import Link from 'next/link';
import SectionTitle from './SectionTitle';
import MedicalCenterCard from './MedicalCenterCard';
import type { MedicalCenter } from '@/lib/public-api';
import { Stethoscope } from 'lucide-react';

interface Props {
  programs: MedicalCenter[];
}

export default function ProgramsSection({ programs }: Props) {
  if (!programs || programs.length === 0) return null;

  return (
    <section id="programs-section" className="py-20 lg:py-24 bg-gray-50">
      <div className="container mx-auto px-4 md:px-8 max-w-7xl">
        <SectionTitle
          title="البرامج الطبية المتخصصة"
          subtitle="برامج علاجية ووقائية متكاملة مصممة بعناية لتقديم رعاية صحية شاملة تناسب احتياجاتك"
          centered={true}
        />

        <div className="flex flex-col lg:flex-row-reverse gap-8 mt-12">
          
          {/* Main Feature Area */}
          <div className="lg:w-7/12" data-aos="fade-left">
            <div className="featured-service-main relative rounded-card overflow-hidden group h-full">
              <div className="service-image-wrapper relative aspect-[4/3] lg:aspect-auto lg:h-full w-full overflow-hidden">
                <img src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=1000&auto=format&fit=crop" alt="برامج طبية متكاملة" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/40 to-transparent"></div>
                <div className="absolute top-6 right-6">
                  <div className="service-badge bg-white/20 backdrop-blur-md px-4 py-2 rounded-pill flex items-center gap-2 text-white font-cairo text-sm font-semibold border border-white/30">
                    <Stethoscope className="w-4 h-4" />
                    <span>رعاية مخصصة</span>
                  </div>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 w-full p-8 md:p-10">
                <h2 className="text-2xl md:text-3xl font-bold text-white font-montserrat mb-3 leading-tight">رحلة علاجية مصممة خصيصاً لك</h2>
                <p className="text-white/80 font-cairo leading-relaxed mb-6 max-w-lg hidden md:block">
                  استكشف برامجنا الطبية التي تقدم مسارات علاجية ووقائية متكاملة تجمع بين التشخيص الدقيق والمتابعة المستمرة لضمان أفضل النتائج.
                </p>
                <Link href="/programs" className="inline-block bg-accent-500 hover:bg-accent-600 text-white font-semibold px-6 py-3 rounded-pill shadow-card-hover transition-all font-cairo">
                  استكشف جميع البرامج
                </Link>
              </div>
            </div>
          </div>

          {/* Services Sidebar */}
          <div className="lg:w-5/12 flex flex-col gap-4" data-aos="fade-right">
            {programs.slice(0, 4).map(program => (
              <MedicalCenterCard key={program.id} center={program} hrefPrefix="/programs" />
            ))}
          </div>
          
        </div>
      </div>
    </section>
  );
}
