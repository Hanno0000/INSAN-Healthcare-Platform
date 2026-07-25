import Link from 'next/link';
import type { NewsPost } from '@/lib/public-api';
import { t, truncate, formatDate } from '@/lib/utils';

interface Props { post: NewsPost; featured?: boolean }

export default function NewsCard({ post, featured = false }: Props) {
  return (
    <Link
      href={`/news/${post.slug}`}
      className={`group bg-white rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col ${featured ? 'md:flex-row' : ''}`}
    >
      {/* Cover image */}
      <div className={`bg-gray-100 overflow-hidden ${featured ? 'md:w-2/5 aspect-video md:aspect-auto' : 'aspect-video'}`}>
        {post.coverImage ? (
          <img
            src={post.coverImage}
            alt={t(post.title)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary-500/10 to-primary-900/5">
            <svg className="w-10 h-10 text-secondary-500/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      <div className={`p-5 flex flex-col flex-1 ${featured ? 'justify-center' : ''}`}>
        {post.category && (
          <span className="inline-block mb-2 text-xs font-semibold text-secondary-500 uppercase tracking-wider">
            {t(post.category.name)}
          </span>
        )}
        <h3 className={`font-bold text-primary-900 leading-snug group-hover:text-secondary-500 transition-colors ${featured ? 'text-xl' : 'text-base'}`}>
          {t(post.title)}
        </h3>
        {post.excerpt && (
          <p className="text-gray-500 text-sm leading-relaxed mt-2 flex-1">
            {truncate(t(post.excerpt), featured ? 200 : 100)}
          </p>
        )}
        {post.publishedAt && (
          <p className="mt-3 text-xs text-gray-400">{formatDate(post.publishedAt)}</p>
        )}
      </div>
    </Link>
  );
}
