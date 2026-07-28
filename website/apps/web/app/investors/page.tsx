import type { Metadata } from 'next';
import PublicLayout from '@/components/public/PublicLayout';
import PageTitle from '@/components/public/PageTitle';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'علاقات المستثمرين | منظومة إنسان',
  description: 'تعرف على فرص الاستثمار والشراكة مع منظومة إنسان للرعاية الصحية.',
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1';

async function getInvestorsPage() {
  try {
    const res = await fetch(`${API_BASE}/investors-page`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    return null;
  }
}

export default async function InvestorsPage() {
  const page = await getInvestorsPage();

  return (
    <PublicLayout>
      <PageTitle 
        title={page?.heroTitle || 'علاقات المستثمرين'} 
        breadcrumbs={[{ label: 'علاقات المستثمرين' }]} 
      />

      <section className="py-20 bg-light-bg relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="container mx-auto px-4 md:px-8 max-w-4xl relative z-10">
          <div className="bg-white rounded-card shadow-sm border border-gray-100 overflow-hidden" data-aos="fade-up">
            
            {page?.heroImage && (
              <div className="w-full h-64 md:h-96 relative">
                <img src={page.heroImage} alt={page.heroTitle} className="w-full h-full object-cover" />
              </div>
            )}

            <div className="p-8 md:p-12">
              {page?.htmlContent ? (
                <div 
                  className="prose prose-lg max-w-none font-cairo text-default prose-headings:font-montserrat prose-headings:text-heading prose-a:text-accent-500 hover:prose-a:text-accent-600 prose-img:rounded-xl prose-img:shadow-sm mb-12"
                  dangerouslySetInnerHTML={{ __html: page.htmlContent }}
                />
              ) : (
                <div className="text-center text-gray-500 py-12 font-cairo">
                  المحتوى قيد التحديث، يرجى العودة لاحقاً.
                </div>
              )}

              {page?.videoUrl && (
                <div className="mt-12 rounded-xl overflow-hidden shadow-sm border border-gray-100 aspect-video relative">
                  <iframe 
                    src={page.videoUrl.includes('watch?v=') ? page.videoUrl.replace('watch?v=', 'embed/') : page.videoUrl} 
                    className="absolute top-0 left-0 w-full h-full" 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                  ></iframe>
                </div>
              )}

              {page?.ctaButtonText && page?.ctaButtonLink && (
                <div className="text-center mt-12 pt-8 border-t border-gray-100">
                  <Link 
                    href={page.ctaButtonLink}
                    className="inline-block bg-accent-500 hover:bg-accent-600 text-white font-bold py-4 px-10 rounded-pill shadow-card-hover transition-all duration-300 font-cairo text-lg"
                  >
                    {page.ctaButtonText}
                  </Link>
                </div>
              )}
            </div>
            
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
