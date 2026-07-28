import React from 'react';
import SectionTitle from './SectionTitle';
import HospitalCard from './HospitalCard';
import type { Hospital } from '@/lib/public-api';

interface Props {
  hospitals: Hospital[];
}

export default function HospitalsSection({ hospitals }: Props) {
  if (!hospitals || hospitals.length === 0) return null;

        const colsClass = hospitals.length === 1 ? 'lg:grid-cols-1' : 
                          hospitals.length === 2 ? 'lg:grid-cols-2' : 
                          hospitals.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4';

        return (
          <section id="featured-departments" className="py-20 lg:py-24 bg-light-bg">
            <div className="container mx-auto px-4 md:px-8 max-w-7xl">
              <SectionTitle
                title="مستشفيات منظومة إنسان"
                subtitle="صروح طبية متكاملة تقدم أحدث بروتوكولات العلاج العالمية برعاية طاقم طبي متميز"
                centered={true}
              />

              <div className={`grid grid-cols-1 md:grid-cols-2 ${colsClass} gap-6 mt-12`}>
                {hospitals.map(hospital => (
                  <div key={hospital.id} className="h-full">
                    <HospitalCard hospital={hospital} />
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
}
