import Link from 'next/link';
import type { Hospital } from '@/lib/public-api';
import { t, truncate } from '@/lib/utils';

export default function HospitalCard({ hospital }: { hospital: Hospital }) {
  const color = hospital.brandColor || '#0E7C86';
  return (
    <Link
      href={`/hospitals/${hospital.slug}`}
      className="group bg-white rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col"
    >
      {/* Top accent */}
      <div className="h-1.5 w-full" style={{ backgroundColor: color }} />

      {/* Hero image */}
      {hospital.heroImage ? (
        <div className="aspect-video bg-gray-100 overflow-hidden">
          <img
            src={hospital.heroImage}
            alt={t(hospital.name)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      ) : (
        <div className="aspect-video flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          <svg className="w-12 h-12 opacity-40" style={{ color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
      )}

      <div className="p-5 flex flex-col flex-1">
        {/* Logo + Name */}
        <div className="flex items-start gap-3 mb-3">
          {hospital.logoUrl ? (
            <img src={hospital.logoUrl} alt="" className="w-10 h-10 rounded-lg object-contain border border-gray-100 shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}20` }}>
              <span className="text-base font-bold" style={{ color }}>{t(hospital.name).charAt(0)}</span>
            </div>
          )}
          <h3 className="font-bold text-primary-900 text-base leading-snug group-hover:text-secondary-500 transition-colors">
            {t(hospital.name)}
          </h3>
        </div>

        <p className="text-gray-500 text-sm leading-relaxed flex-1">
          {truncate(t(hospital.shortDescription), 110)}
        </p>

        <div className="mt-4 flex items-center gap-1 text-secondary-500 text-sm font-semibold">
          <span>اعرف أكثر</span>
          <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}
