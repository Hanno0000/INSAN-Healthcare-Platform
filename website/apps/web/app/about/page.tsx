import type { Metadata } from 'next';
import PublicLayout from '@/components/public/PublicLayout';
import PageTitle from '@/components/public/PageTitle';
import WhyChooseUsSection from '@/components/public/WhyChooseUsSection';
import CTASection from '@/components/public/CTASection';

export const metadata: Metadata = {
  title: 'عن منظومة إنسان | الرعاية الصحية المتكاملة',
  description: 'تعرف على قصة منظومة إنسان ورؤيتنا في تقديم أفضل خدمات الرعاية الصحية في مصر.',
};

export default function AboutPage() {
  return (
    <PublicLayout>
      <PageTitle 
        title="عن منظومة إنسان" 
        breadcrumbs={[{ label: 'عن المنظومة' }]} 
      />
      
      <WhyChooseUsSection />
      
      {/* Additional About Content could go here, like Vision/Mission */}
      <section className="py-20 bg-light-bg">
        <div className="container mx-auto px-4 max-w-4xl text-center font-cairo">
          <h3 className="text-3xl font-bold text-heading font-montserrat mb-6">رؤيتنا ورسالتنا</h3>
          <p className="text-default text-lg leading-relaxed mb-6">
            نسعى في منظومة إنسان إلى الارتقاء بمستوى الرعاية الصحية في مصر والشرق الأوسط من خلال دمج الكفاءات الطبية الاستثنائية مع أحدث ما توصلت إليه التكنولوجيا الطبية في العالم، مع الحفاظ الدائم على الجانب الإنساني في التعامل مع المرضى.
          </p>
          <p className="text-default text-lg leading-relaxed">
            رسالتنا هي توفير بيئة استشفائية آمنة ومتطورة، تضع المريض في مركز الاهتمام، وتضمن حصوله على أفضل النتائج العلاجية الممكنة.
          </p>
        </div>
      </section>

      <CTASection />
    </PublicLayout>
  );
}
