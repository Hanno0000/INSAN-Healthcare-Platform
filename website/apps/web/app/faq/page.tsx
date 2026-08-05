import type { Metadata } from 'next';
import PublicLayout from '@/components/public/PublicLayout';
import PageTitle from '@/components/public/PageTitle';
import EmptyState from '@/components/public/EmptyState';
import FaqAccordion from '@/components/public/FaqAccordion';
import CTASection from '@/components/public/CTASection';
import { getFaqs } from '@/lib/public-api';
import { t } from '@/lib/utils';
import { MessageCircleQuestion } from 'lucide-react';

export const metadata: Metadata = {
  title: 'الأسئلة الشائعة | منظومة إنسان',
  description: 'إجابات شاملة على الأسئلة الشائعة حول منظومة إنسان، حجز المواعيد، الطوارئ، وخدمات الرعاية الصحية.',
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

      {/* Hero Intro */}
      <section className="py-16 bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <div className="w-20 h-20 bg-accent-50 text-accent-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <MessageCircleQuestion className="w-10 h-10" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-heading font-montserrat mb-4">كيف يمكننا مساعدتك؟</h2>
          <p className="text-default font-cairo text-lg leading-relaxed">
            لقد جمعنا لك الإجابات على أكثر الأسئلة شيوعاً حول خدماتنا، مواعيدنا، والتأمين الطبي. إذا لم تجد إجابة لسؤالك، فريق خدمة العملاء متواجد دائماً لمساعدتك.
          </p>
        </div>
      </section>

      <section className="py-20 bg-light-bg min-h-[60vh] relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-20 right-0 w-96 h-96 bg-accent-50 rounded-full -z-10 blur-3xl opacity-60"></div>
        <div className="absolute bottom-20 left-0 w-96 h-96 bg-blue-50 rounded-full -z-10 blur-3xl opacity-60"></div>

        <div className="container mx-auto px-4 max-w-4xl relative z-10">
          {faqs.length > 0 ? (
            <FaqAccordion faqsByTopic={faqsByTopic} />
          ) : (
            <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-100 text-center">
              <EmptyState 
                title="لا توجد أسئلة شائعة حالياً"
                description="لم يتم إضافة أسئلة شائعة بعد. يرجى التحقق لاحقاً أو التواصل معنا مباشرة لأي استفسار."
                icon="❓"
              />
            </div>
          )}
        </div>
      </section>

      <CTASection />
    </PublicLayout>
  );
}
