import type { Metadata } from 'next';
import PublicLayout from '@/components/public/PublicLayout';
import DoctorCard from '@/components/public/DoctorCard';
import Pagination from '@/components/public/Pagination';
import EmptyState from '@/components/public/EmptyState';
import PageTitle from '@/components/public/PageTitle';
import { getDoctors } from '@/lib/public-api';

export const metadata: Metadata = {
  title: 'الأطباء | منظومة إنسان',
  description: 'تصفح نخبة أطباء منظومة إنسان في مختلف التخصصات',
};

interface Props { searchParams: { page?: string; search?: string } }

export default async function DoctorsPage({ searchParams }: Props) {
  const page = Number(searchParams.page) || 1;
  const search = searchParams.search || undefined;
  const result = await getDoctors({ page, pageSize: 12, search });

  return (
    <PublicLayout>
      <PageTitle 
        title="نخبة أطبائنا" 
        breadcrumbs={[{ label: 'الأطباء' }]} 
      />

      <section className="py-12 bg-white min-h-[60vh]">
        <div className="container mx-auto px-4 md:px-8 max-w-7xl">
          
          <form method="get" className="max-w-xl mx-auto mb-12">
            <div className="relative">
              <input
                type="search" name="search" defaultValue={search}
                placeholder="ابحث عن طبيب أو تخصص..."
                className="w-full bg-light-bg border border-gray-100 rounded-pill px-6 py-4 text-heading placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 font-cairo shadow-sm"
              />
              <button type="submit" className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-accent-500 text-white rounded-full flex items-center justify-center hover:bg-accent-600 transition-colors shadow-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </form>

          {result && result.data.length > 0 ? (
            <>
              <p className="text-sm font-semibold text-gray-500 mb-6 font-cairo">
                إجمالي الأطباء: {result.meta.total}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {result.data.map(d => (
                  <div key={d.id} className="h-full">
                    <DoctorCard doctor={d} />
                  </div>
                ))}
              </div>
              <div className="mt-12">
                <Pagination
                  page={page} totalPages={result.meta.totalPages}
                  buildHref={p => `/doctors?page=${p}${search ? `&search=${encodeURIComponent(search)}` : ''}`}
                />
              </div>
            </>
          ) : (
            <EmptyState title="لا يوجد أطباء حالياً" icon="👨‍⚕️" />
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
