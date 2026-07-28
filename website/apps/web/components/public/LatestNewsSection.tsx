import React from 'react';
import SectionTitle from './SectionTitle';
import NewsCard from './NewsCard';
import type { NewsPost } from '@/lib/public-api';

interface Props {
  news: NewsPost[];
}

export default function LatestNewsSection({ news }: Props) {
  if (!news || news.length === 0) return null;

  return (
    <section className="py-20 lg:py-24 bg-white">
      <div className="container mx-auto px-4 md:px-8 max-w-7xl">
        <SectionTitle
          title="أحدث المقالات والأخبار"
          subtitle="تابع أحدث نصائح الصحة والعافية، وأخبار منظومة إنسان، والتطورات الطبية."
          centered={true}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          {news.map((post, index) => (
            <div key={post.id} className={index === 0 && news.length >= 3 ? "lg:col-span-2" : ""}>
              <NewsCard post={post} featured={index === 0 && news.length >= 3} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
