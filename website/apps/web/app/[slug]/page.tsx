import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PublicLayout from '@/components/public/PublicLayout';
import Breadcrumb from '@/components/public/Breadcrumb';
import { getCmsPage } from '@/lib/public-api';
import { t } from '@/lib/utils';

interface Props { params: { slug: string } }

// These slugs are handled by dedicated routes — don't catch them here
const RESERVED = new Set([
  'admin', 'hospitals', 'medical-centers', 'doctors',
  'news', 'contact', 'book', 'search', '_next', 'favicon.ico',
]);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (RESERVED.has(params.slug)) return {};
  const res = await getCmsPage(params.slug);
  if (!res?.data) return { title: 'صفحة | منظومة إنسان' };
  return {
    title: t(res.data.metaTitle) || `${t(res.data.title)} | منظومة إنسان`,
    description: t(res.data.metaDescription),
  };
}

export default async function CmsPage({ params }: Props) {
  if (RESERVED.has(params.slug)) notFound();

  const res = await getCmsPage(params.slug);
  if (!res?.data) notFound();
  const page = res.data;

  return (
    <PublicLayout>
      {/* Header */}
      <section className="bg-primary-900 text-white py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <Breadcrumb crumbs={[
            { label: 'الرئيسية', href: '/' },
            { label: t(page.title) },
          ]} />
          <h1 className="text-3xl sm:text-4xl font-bold mt-2">{t(page.title)}</h1>
        </div>
      </section>

      {/* Sections */}
      <article className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          {page.sections && page.sections.length > 0 ? (
            <div className="space-y-10">
              {[...page.sections]
                .sort((a, b) => a.order - b.order)
                .map(section => (
                  <CmsSection key={section.id} section={section} />
                ))
              }
            </div>
          ) : (
            <p className="text-gray-400 text-center py-12">لا يوجد محتوى متاح حالياً.</p>
          )}
        </div>
      </article>
    </PublicLayout>
  );
}

function CmsSection({ section }: { section: { type: string; content: Record<string, any> } }) {
  const c = section.content;

  switch (section.type) {
    case 'text':
    case 'rich_text':
      return (
        <div className="prose prose-lg prose-gray max-w-none leading-relaxed">
          {c.title && <h2 className="text-2xl font-bold text-primary-900">{t(c.title) || c.title}</h2>}
          {c.body && <p>{t(c.body) || c.body}</p>}
        </div>
      );

    case 'hero':
      return (
        <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-primary-900 to-secondary-500 text-white p-10">
          {c.title && <h2 className="text-2xl font-bold mb-3">{t(c.title) || c.title}</h2>}
          {c.subtitle && <p className="text-white/80">{t(c.subtitle) || c.subtitle}</p>}
        </div>
      );

    case 'cta':
      return (
        <div className="bg-secondary-500/10 rounded-2xl p-8 text-center border border-secondary-500/20">
          {c.title && <h3 className="text-xl font-bold text-primary-900 mb-3">{t(c.title) || c.title}</h3>}
          {c.description && <p className="text-gray-600 mb-4">{t(c.description) || c.description}</p>}
          {c.buttonText && c.buttonLink && (
            <a href={c.buttonLink} className="inline-block bg-secondary-500 hover:bg-secondary-500/90 text-white font-semibold px-6 py-3 rounded-xl transition-colors">
              {t(c.buttonText) || c.buttonText}
            </a>
          )}
        </div>
      );

    case 'faq':
      return (
        <div>
          {c.title && <h2 className="text-2xl font-bold text-primary-900 mb-6">{t(c.title) || c.title}</h2>}
          {Array.isArray(c.items) && (
            <div className="space-y-3">
              {c.items.map((item: any, i: number) => (
                <details key={i} className="bg-gray-50 rounded-xl border border-gray-100 p-4 group">
                  <summary className="font-semibold text-primary-900 cursor-pointer list-none flex justify-between items-center">
                    {t(item.question) || item.question}
                    <svg className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <p className="mt-3 text-gray-600 text-sm leading-relaxed">{t(item.answer) || item.answer}</p>
                </details>
              ))}
            </div>
          )}
        </div>
      );

    default:
      return (
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 text-sm text-gray-500">
          <span className="font-mono text-xs text-gray-400">[{section.type}]</span>
          <pre className="mt-2 text-xs overflow-auto">{JSON.stringify(c, null, 2)}</pre>
        </div>
      );
  }
}
