import type { Metadata } from 'next';
import PublicLayout from '@/components/public/PublicLayout';
import MedicalCenterCard from '@/components/public/MedicalCenterCard';
import Pagination from '@/components/public/Pagination';
import EmptyState from '@/components/public/EmptyState';
import SectionTitle from '@/components/public/SectionTitle';
import { getMedicalCenters } from '@/lib/public-api';

export const metadata: Metadata = {
  title: 'البرامج الطبية | منظومة إنسان',
  description: 'استكشف البرامج الطبية في منظومة إنسان',
};

interface Props { searchParams: { page?: string; search?: string } }

export default async function ProgramsPage({ searchParams }: Props) {
  const page = Number(searchParams.page) || 1;
  const search = searchParams.search || undefined;
  const result = await getMedicalCenters({ page, pageSize: 12, search, type: 'PROGRAM' });

  return (
    <PublicLayout>
      <section className="bg-primary-900 text-white py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <SectionTitle
            title="البرامج الطبية"
            subtitle="برامج صحية متكاملة مصممة خصيصاً لرعايتك"
            light
          />
          <form method="get" className="max-w-md mx-auto mt-4">
            <div className="relative">
              <input
                type="search" name="search" defaultValue={search}
                placeholder="ابحث عن برنامج طبي..."
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

      <section className="py-12 bg-gray-50 min-h-[60vh]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {result && result.data.length > 0 ? (
            <>
              <p className="text-sm text-gray-500 mb-6">{result.meta.total} برنامج طبي</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {result.data.map(c => <MedicalCenterCard key={c.id} center={c} hrefPrefix="/programs" />)}
              </div>
              <Pagination
                page={page} totalPages={result.meta.totalPages}
                buildHref={p => `/programs?page=${p}${search ? `&search=${encodeURIComponent(search)}` : ''}`}
              />
            </>
          ) : (
            <EmptyState title="لا توجد برامج طبية حالياً" icon="🏨" />
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
