import SectionTitle from './SectionTitle';
import NewsCard from './NewsCard';
import type { Bilingual } from '@/lib/public-api';

interface NewsItem {
  id: string;
  slug: string;
  title: Bilingual;
  excerpt?: Bilingual;
  featuredImage?: string;
  publishedAt?: string;
}

interface Props {
  posts: NewsItem[];
}

export default function HospitalNewsSection({ posts }: Props) {
  if (!posts || posts.length === 0) return null;

  return (
    <section className="py-20 lg:py-24 bg-white">
      <div className="container mx-auto px-4 md:px-8 max-w-7xl">
        <SectionTitle
          title="أحدث الأخبار"
          subtitle="تابع أحدث أخبار المستشفى ونصائح الصحة والعافية"
          centered={true}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          {posts.map((post) => (
            <NewsCard
              key={post.id}
              // NewsCard reads `coverImage` — map from the API's `featuredImage`.
              post={{ ...post, coverImage: post.featuredImage }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
