import Link from 'next/link';
import type { NewsPost } from '@/lib/public-api';
import { t, truncate, formatDate } from '@/lib/utils';
import { ArrowRight, Calendar, Tag, Facebook } from 'lucide-react';

interface Props { post: any; featured?: boolean }

export default function NewsCard({ post, featured = false }: Props) {
  const isExternal = post.sourceType === 'SOCIAL_SYNC' && post.externalPermalink;
  const href = isExternal ? post.externalPermalink : `/news/${post.slug}`;

  return (
    <div className={`group bg-white rounded-card border border-gray-100 hover:border-transparent hover:shadow-floating transition-all duration-300 overflow-hidden flex flex-col h-full ${featured ? 'md:flex-row md:col-span-2' : ''}`} data-aos="fade-up">
      
      {/* Cover Image */}
      <div className={`relative overflow-hidden ${featured ? 'md:w-1/2 aspect-[4/3] md:aspect-auto' : 'aspect-[4/3]'}`}>
        {post.coverImage ? (
          <img
            src={post.coverImage}
            alt={t(post.title)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full bg-light-bg flex items-center justify-center">
            {isExternal ? (
              <Facebook className="w-12 h-12 text-blue-500/30" />
            ) : (
              <Tag className="w-12 h-12 text-gray-300" />
            )}
          </div>
        )}
        
        {/* Date Badge */}
        {post.publishedAt && (
          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur text-heading px-3 py-1.5 rounded-md shadow-sm flex items-center gap-2 font-cairo text-sm font-bold">
            <Calendar className="w-4 h-4 text-accent-500" />
            {formatDate(post.publishedAt)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className={`p-6 md:p-8 flex flex-col flex-1 ${featured ? 'md:w-1/2 justify-center' : ''}`}>
        
        {/* Category */}
        {post.category && (
          <div className="mb-4">
            <span className="inline-block bg-accent-500/10 text-accent-500 text-xs font-bold px-3 py-1 rounded-pill font-cairo">
              {t(post.category.name)}
            </span>
          </div>
        )}
        
        {/* Title */}
        <h3 className={`font-bold text-heading font-montserrat mb-3 group-hover:text-accent-500 transition-colors ${featured ? 'text-2xl' : 'text-xl'}`}>
          <a href={href} target={isExternal ? '_blank' : '_self'} rel={isExternal ? 'noopener noreferrer' : ''} className="hover:text-accent-500 transition-colors">
            {t(post.title)}
          </a>
        </h3>
        
        {/* Excerpt */}
        {post.excerpt && (
          <p className="text-default text-sm font-cairo leading-relaxed mb-6 flex-1">
            {truncate(t(post.excerpt), featured ? 200 : 120)}
          </p>
        )}
        
        {/* Read More Link */}
        <a href={href} target={isExternal ? '_blank' : '_self'} rel={isExternal ? 'noopener noreferrer' : ''} className="inline-flex items-center gap-2 text-sm font-bold text-heading hover:text-accent-500 transition-colors font-cairo mt-auto">
          {isExternal ? 'عرض على فيسبوك' : 'اقرأ المزيد'} <ArrowRight className="w-4 h-4 rtl:rotate-180" />
        </a>
      </div>
    </div>
  );
}
