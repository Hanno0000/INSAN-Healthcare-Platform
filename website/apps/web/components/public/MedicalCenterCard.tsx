import Link from 'next/link';
import type { MedicalCenter } from '@/lib/public-api';
import { t, truncate } from '@/lib/utils';

export default function MedicalCenterCard({ center }: { center: MedicalCenter }) {
  const color = center.brandColor || '#0E7C86';
  return (
    <Link
      href={`/medical-centers/${center.slug}`}
      className="group bg-white rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col"
    >
      <div className="h-1.5 w-full" style={{ backgroundColor: color }} />
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start gap-3 mb-3">
          {center.logoUrl ? (
            <img src={center.logoUrl} alt={t(center.name)} className="w-10 h-10 rounded-lg object-contain border border-gray-100 shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}20` }}>
              <span className="font-bold" style={{ color }}>{t(center.name).charAt(0)}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-primary-900 text-sm leading-snug group-hover:text-secondary-500 transition-colors">
              {t(center.name)}
            </h3>
            {center.hospitals && center.hospitals.length > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">{t(center.hospitals[0].name)}</p>
            )}
          </div>
        </div>
        {center.shortDescription && (
          <p className="text-gray-500 text-sm leading-relaxed flex-1">
            {truncate(t(center.shortDescription), 100)}
          </p>
        )}
        <div className="mt-4 flex items-center gap-1 text-secondary-500 text-sm font-semibold">
          <span>التفاصيل</span>
          <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}
