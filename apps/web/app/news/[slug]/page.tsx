import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import PublicLayout from '@/components/public/PublicLayout';
import Breadcrumb from '@/components/public/Breadcrumb';
import { getNewsPost } from '@/lib/public-api';
import { t, formatDate } from '@/lib/utils';

interface Props { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const res = await getNewsPost(params.slug);
  if (!res?.data) return { title: 'خبر | منظومة إنسان' };
  return {
    title: t(res.data.metaTitle) || `${t(res.data.title)} | منظومة إنسان`,
    description: t(res.data.metaDescription) || t(res.data.excerpt),
    openGraph: {
      title: t(res.data.title),
      description: t(res.data.excerpt),
      images: res.data.coverImage ? [res.data.coverImage] : [],
    },
  };
}

export default async function NewsDetailPage({ params }: Props) {
  const res = await getNewsPost(params.slug);
  if (!res?.data) notFound();
  const post = res.data;

  return (
    <PublicLayout>
      {/* Cover */}
      {post.coverImage && (
        <div className="aspect-[21/7] overflow-hidden bg-gray-100">
          <img src={post.coverImage} alt={t(post.title)} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Content */}
      <article className="py-12 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <Breadcrumb crumbs={[
            { label: 'الرئيسية', href: '/' },
            { label: 'الأخبار', href: '/news' },
            ...(post.category ? [{ label: t(post.category.name), href: `/news?categoryId=${post.category.id}` }] : []),
            { label: t(post.title) },
          ]} />

          {post.category && (
            <Link href={`/news?categoryId=${post.category.id}`} className="inline-block mb-3 text-xs font-semibold text-secondary-500 uppercase tracking-wider hover:underline">
              {t(post.category.name)}
            </Link>
          )}

          <h1 className="text-3xl sm:text-4xl font-bold text-primary-900 leading-tight mb-4">
            {t(post.title)}
          </h1>

          {post.excerpt && (
            <p className="text-gray-500 text-lg leading-relaxed mb-6 border-r-4 border-secondary-500 pr-4">
              {t(post.excerpt)}
            </p>
          )}

          {post.publishedAt && (
            <p className="text-sm text-gray-400 mb-8">{formatDate(post.publishedAt)}</p>
          )}

          <div className="prose prose-lg prose-gray max-w-none leading-relaxed text-gray-700">
            {post.content ? (
              <p>{t(post.content)}</p>
            ) : (
              <p className="text-gray-400 italic">لا يوجد محتوى متاح حالياً.</p>
            )}
          </div>

          {/* Back link */}
          <div className="mt-12 pt-6 border-t border-gray-100">
            <Link href="/news" className="inline-flex items-center gap-2 text-secondary-500 hover:underline text-sm font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              العودة إلى الأخبار
            </Link>
          </div>
        </div>
      </article>
    </PublicLayout>
  );
}
