import type { Metadata } from 'next';
import PublicLayout from '@/components/public/PublicLayout';
import HospitalCard from '@/components/public/HospitalCard';
import Pagination from '@/components/public/Pagination';
import EmptyState from '@/components/public/EmptyState';
import SectionTitle from '@/components/public/SectionTitle';
import { getHospitals } from '@/lib/public-api';

export const metadata: Metadata = {
  title: 'مستشفياتنا | منظومة إنسان',
  description: 'استكشف منظومة مستشفيات إنسان — رعاية صحية بمعايير دولية',
};

interface Props { searchParams: { page?: string; search?: string } }

export default async function HospitalsPage({ searchParams }: Props) {
  const page = Number(searchParams.page) || 1;
  const search = searchParams.search || undefined;
  const result = await getHospitals({ page, pageSize: 12, search });

  return (
    <PublicLayout>
      {/* Header */}
      <section className="bg-primary-900 text-white py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <SectionTitle
            title="مستشفياتنا"
            subtitle="منظومة من أرقى المستشفيات تعمل بمعايير دولية وقيم إنسانية"
            light
          />
          {/* Search */}
          <form method="get" className="max-w-md mx-auto mt-4">
            <div className="relative">
              <input
                type="search"
                name="search"
                defaultValue={search}
                placeholder="ابحث عن مستشفى..."
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-secondary-500 text-sm"
              />
              <button type="submit" className="absolute left-3 top-1/2 -translate-y-1/2">
                <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Listing */}
      <section className="py-12 bg-gray-50 min-h-[60vh]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {result && result.data.length > 0 ? (
            <>
              <p className="text-sm text-gray-500 mb-6">
                {result.meta.total} مستشفى
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {result.data.map(h => <HospitalCard key={h.id} hospital={h} />)}
              </div>
              <Pagination
                page={page}
                totalPages={result.meta.totalPages}
                buildHref={p => `/hospitals?page=${p}${search ? `&search=${encodeURIComponent(search)}` : ''}`}
              />
            </>
          ) : (
            <EmptyState
              title="لا توجد مستشفيات حالياً"
              description="لم يتم العثور على مستشفيات مطابقة لبحثك."
              icon="🏥"
            />
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
