import type { Metadata } from 'next';
import Link from 'next/link';
import PublicLayout from '@/components/public/PublicLayout';
import NewsCard from '@/components/public/NewsCard';
import Pagination from '@/components/public/Pagination';
import EmptyState from '@/components/public/EmptyState';
import SectionTitle from '@/components/public/SectionTitle';
import { getNewsPosts, getNewsCategories } from '@/lib/public-api';
import { t } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'الأخبار | منظومة إنسان',
  description: 'آخر أخبار منظومة إنسان والمجال الطبي في مصر',
};

interface Props { searchParams: { page?: string; categoryId?: string; search?: string } }

export default async function NewsPage({ searchParams }: Props) {
  const page = Number(searchParams.page) || 1;
  const categoryId = searchParams.categoryId || undefined;
  const search = searchParams.search || undefined;

  const [result, categories] = await Promise.all([
    getNewsPosts({ page, pageSize: 12, categoryId, search }),
    getNewsCategories(),
  ]);

  return (
    <PublicLayout>
      <section className="bg-primary-900 text-white py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <SectionTitle title="آخر الأخبار" subtitle="تابع أحدث أخبار منظومة إنسان والمجال الطبي" light />
          <form method="get" className="max-w-md mx-auto mt-4">
            {categoryId && <input type="hidden" name="categoryId" value={categoryId} />}
            <div className="relative">
              <input
                type="search" name="search" defaultValue={search}
                placeholder="ابحث في الأخبار..."
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
          {/* Category filter */}
          {categories && categories.data.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              <Link
                href="/news"
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${!categoryId ? 'bg-secondary-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
              >
                الكل
              </Link>
              {categories.data.map(cat => (
                <Link
                  key={cat.id}
                  href={`/news?categoryId=${cat.id}`}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${categoryId === cat.id ? 'bg-secondary-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
                >
                  {t(cat.name)}
                </Link>
              ))}
            </div>
          )}

          {result && result.data.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {result.data.map(p => <NewsCard key={p.id} post={p} />)}
              </div>
              <Pagination
                page={page} totalPages={result.meta.totalPages}
                buildHref={p => `/news?page=${p}${categoryId ? `&categoryId=${categoryId}` : ''}${search ? `&search=${encodeURIComponent(search)}` : ''}`}
              />
            </>
          ) : (
            <EmptyState title="لا توجد أخبار حالياً" icon="📰" />
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
