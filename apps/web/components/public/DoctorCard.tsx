import Link from 'next/link';
import type { Doctor } from '@/lib/public-api';
import { t, truncate } from '@/lib/utils';

export default function DoctorCard({ doctor }: { doctor: Doctor }) {
  return (
    <Link
      href={`/doctors/${doctor.slug}`}
      className="group bg-white rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-200 p-5 flex items-start gap-4"
    >
      {/* Avatar */}
      <div className="shrink-0">
        {doctor.photo ? (
          <img
            src={doctor.photo}
            alt={t(doctor.name)}
            className="w-16 h-16 rounded-xl object-cover border border-gray-100"
          />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-secondary-500/10 flex items-center justify-center">
            <svg className="w-7 h-7 text-secondary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-primary-900 text-sm group-hover:text-secondary-500 transition-colors">
          {t(doctor.name)}
        </h3>
        {doctor.specialty && (
          <p className="text-secondary-500 text-xs font-medium mt-0.5">{t(doctor.specialty)}</p>
        )}
        {doctor.bio && (
          <p className="text-gray-500 text-xs leading-relaxed mt-2">
            {truncate(t(doctor.bio), 90)}
          </p>
        )}
        {doctor.hospitals && doctor.hospitals.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {doctor.hospitals.slice(0, 2).map(h => (
              <span key={h.id} className="inline-block text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
                {t(h.name)}
              </span>
            ))}
          </div>
        )}
      </div>

      <svg className="w-4 h-4 text-gray-300 group-hover:text-secondary-500 transition-colors shrink-0 mt-1 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}
