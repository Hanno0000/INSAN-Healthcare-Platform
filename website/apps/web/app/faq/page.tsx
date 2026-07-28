import type { Metadata } from 'next';
import PublicLayout from '@/components/public/PublicLayout';
import PageTitle from '@/components/public/PageTitle';
import EmptyState from '@/components/public/EmptyState';
import { getFaqs } from '@/lib/public-api';
import { t } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'الأسئلة الشائعة | منظومة إنسان',
  description: 'إجابات على الأسئلة الشائعة حول منظومة إنسان وخدماتها.',
};

export default async function FaqPage() {
  const result = await getFaqs({ pageSize: 100 });
  const faqs = result?.data || [];

  // Group FAQs by topic
  const faqsByTopic = faqs.reduce((acc, faq) => {
    const topic = t(faq.topic) || 'عام';
    if (!acc[topic]) acc[topic] = [];
    acc[topic].push(faq);
    return acc;
  }, {} as Record<string, typeof faqs>);

  return (
    <PublicLayout>
      <PageTitle 
        title="الأسئلة الشائعة" 
        breadcrumbs={[{ label: 'الأسئلة الشائعة' }]} 
      />

      <section className="py-20 bg-white min-h-[60vh]">
        <div className="container mx-auto px-4 max-w-4xl">
          
          {faqs.length > 0 ? (
            <div className="space-y-12">
              {Object.entries(faqsByTopic).map(([topic, topicFaqs]) => (
                <div key={topic} className="faq-section">
                  <h2 className="text-2xl font-bold text-heading font-montserrat mb-6 pb-2 border-b-2 border-accent-500 inline-block">
                    {topic}
                  </h2>
                  <div className="space-y-4">
                    {topicFaqs.sort((a, b) => a.order - b.order).map((faq) => (
                      <div key={faq.id} className="bg-light-bg rounded-card p-6 border border-gray-100 hover:shadow-sm transition-shadow">
                        <h3 className="text-lg font-bold text-heading font-cairo mb-3">
                          {t(faq.question)}
                        </h3>
                        <p className="text-default font-cairo leading-relaxed">
                          {t(faq.answer)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState 
              title="لا توجد أسئلة شائعة حالياً"
              description="لم يتم إضافة أسئلة شائعة بعد. يرجى التحقق لاحقاً."
              icon="❓"
            />
          )}

        </div>
      </section>
    </PublicLayout>
  );
}
