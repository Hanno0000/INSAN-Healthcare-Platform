import React from 'react';
import SectionTitle from './SectionTitle';
import DoctorCard from './DoctorCard';
import type { Doctor } from '@/lib/public-api';

interface Props {
  doctors: Doctor[];
}

export default function DoctorsSection({ doctors }: Props) {
  if (!doctors || doctors.length === 0) return null;

  return (
    <section id="find-a-doctor" className="py-20 lg:py-24 bg-gray-50/50">
      <div className="container mx-auto px-4 md:px-8 max-w-7xl">
        <SectionTitle
          title="نخبة أطبائنا"
          subtitle="تضم منظومة إنسان كفاءات طبية استثنائية من الاستشاريين والأخصائيين ذوي الخبرة الواسعة لتوفير أفضل رعاية صحية."
          centered={true}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          {doctors.map(doctor => (
            <div key={doctor.id} className="h-full">
              <DoctorCard doctor={doctor} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
