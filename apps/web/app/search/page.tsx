import type { Metadata } from 'next';
import PublicLayout from '@/components/public/PublicLayout';
import HospitalCard from '@/components/public/HospitalCard';
import MedicalCenterCard from '@/components/public/MedicalCenterCard';
import DoctorCard from '@/components/public/DoctorCard';
import NewsCard from '@/components/public/NewsCard';
import { getHospitals, getMedicalCenters, getDoctors, getNewsPosts } from '@/lib/public-api';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'بحث | منظومة إنسان',
};

interface Props { searchParams: { q?: string } }

export default async function SearchPage({ searchParams }: Props) {
  const q = searchParams.q?.trim() || '';

  const [hospitals, centers, doctors, news] = q
    ? await Promise.all([
        getHospitals({ search: q, pageSize: 4 }),
        getMedicalCenters({ search: q, pageSize: 4 }),
        getDoctors({ search: q, pageSize: 6 }),
        getNewsPosts({ search: q, pageSize: 4 }),
      ])
    : [null, null, null, null];

  const totalResults =
    (hospitals?.meta.total ?? 0) +
    (centers?.meta.total ?? 0) +
    (doctors?.meta.total ?? 0) +
    (news?.meta.total ?? 0);

  return (
    <PublicLayout>
      {/* Search bar */}
      <section className="bg-primary-900 text-white py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h1 className="text-2xl font-bold mb-6 text-center">ابحث في منظومة إنسان</h1>
          <form method="get" className="relative">
            <input
              type="search" name="q" defaultValue={q}
              placeholder="ابحث عن مستشفى، طبيب، مركز طبي، خبر..."
              autoFocus
              className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-4 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-secondary-500 text-base"
            />
            <button type="submit" className="absolute left-4 top-1/2 -translate-y-1/2">
              <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </form>
        </div>
      </section>

      <section className="py-12 bg-gray-50 min-h-[60vh]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {!q ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🔍</div>
              <p className="text-gray-500">ابدأ بكتابة ما تبحث عنه</p>
            </div>
          ) : totalResults === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">😕</div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">لم نجد نتائج لـ &ldquo;{q}&rdquo;</h3>
              <p className="text-gray-400 text-sm">جرب كلمات مختلفة أو تصفح الأقسام مباشرة</p>
            </div>
          ) : (
            <div className="space-y-12">
              <p className="text-sm text-gray-500">{totalResults} نتيجة لـ &ldquo;{q}&rdquo;</p>

              {hospitals && hospitals.data.length > 0 && (
                <div>
                  <h2 className="text-lg font-bold text-primary-900 mb-4">المستشفيات ({hospitals.meta.total})</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {hospitals.data.map(h => <HospitalCard key={h.id} hospital={h} />)}
                  </div>
                </div>
              )}

              {centers && centers.data.length > 0 && (
                <div>
                  <h2 className="text-lg font-bold text-primary-900 mb-4">المراكز الطبية ({centers.meta.total})</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {centers.data.map(c => <MedicalCenterCard key={c.id} center={c} />)}
                  </div>
                </div>
              )}

              {doctors && doctors.data.length > 0 && (
                <div>
                  <h2 className="text-lg font-bold text-primary-900 mb-4">الأطباء ({doctors.meta.total})</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {doctors.data.map(d => <DoctorCard key={d.id} doctor={d} />)}
                  </div>
                </div>
              )}

              {news && news.data.length > 0 && (
                <div>
                  <h2 className="text-lg font-bold text-primary-900 mb-4">الأخبار ({news.meta.total})</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {news.data.map(p => <NewsCard key={p.id} post={p} />)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
