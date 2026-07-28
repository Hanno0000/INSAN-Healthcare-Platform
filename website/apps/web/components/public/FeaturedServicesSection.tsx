'use client';

import React from 'react';
import Link from 'next/link';
import SectionTitle from './SectionTitle';
import MedicalCenterCard from './MedicalCenterCard';
import type { MedicalCenter } from '@/lib/public-api';
import { HeartPulse } from 'lucide-react';

interface Props {
  centers: MedicalCenter[];
}

export default function FeaturedServicesSection({ centers }: Props) {
  if (!centers || centers.length === 0) return null;

  return (
    <section id="featured-services" className="py-20 lg:py-24 bg-white">
      <div className="container mx-auto px-4 md:px-8 max-w-7xl">
        <SectionTitle
          title="المراكز الطبية التخصصية"
          subtitle="تغطية طبية شاملة عبر مراكز متخصصة موزعة جغرافياً لتكون الأقرب إليك دائماً"
          centered={true}
        />

        <div className="flex flex-col lg:flex-row gap-8 mt-12">
          
          {/* Main Feature Area */}
          <div className="lg:w-7/12" data-aos="fade-right">
            <div className="featured-service-main relative rounded-card overflow-hidden group">
              <div className="service-image-wrapper relative aspect-[4/3] w-full overflow-hidden">
                <img src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=1000&auto=format&fit=crop" alt="رعاية طبية متميزة" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/90 to-transparent"></div>
                <div className="absolute top-6 left-6">
                  <div className="service-badge bg-white/20 backdrop-blur-md px-4 py-2 rounded-pill flex items-center gap-2 text-white font-cairo text-sm font-semibold border border-white/30">
                    <HeartPulse className="w-4 h-4" />
                    <span>رعاية شاملة</span>
                  </div>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 w-full p-8 md:p-10">
                <h2 className="text-2xl md:text-3xl font-bold text-white font-montserrat mb-3 leading-tight">عيادات تخصصية متكاملة بانتظارك</h2>
                <p className="text-white/80 font-cairo leading-relaxed mb-6 max-w-lg hidden md:block">
                  توفر مراكزنا الطبية استشارات متخصصة وعيادات خارجية مجهزة بأحدث التقنيات التشخيصية والعلاجية لتلبية احتياجاتك اليومية.
                </p>
                <Link href="/medical-centers" className="inline-block bg-accent-500 hover:bg-accent-600 text-white font-semibold px-6 py-3 rounded-pill shadow-card-hover transition-all font-cairo">
                  استكشف جميع المراكز
                </Link>
              </div>
            </div>
          </div>

          {/* Services Sidebar */}
          <div className="lg:w-5/12 flex flex-col gap-4" data-aos="fade-left">
            {centers.slice(0, 4).map(center => (
              <MedicalCenterCard key={center.id} center={center} />
            ))}
          </div>
          
        </div>
      </div>
    </section>
  );
}
