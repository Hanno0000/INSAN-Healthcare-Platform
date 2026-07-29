import type { Metadata } from 'next';
import PublicLayout from '@/components/public/PublicLayout';
import PageTitle from '@/components/public/PageTitle';
import Link from 'next/link';
import { ArrowRight, Stethoscope, Activity, Heart, Shield, Syringe } from 'lucide-react'; // Using standard lucide-react icons

export const metadata: Metadata = {
  title: 'خدماتنا | منظومة إنسان',
  description: 'تعرف على الخدمات الطبية المتكاملة التي تقدمها منظومة إنسان للرعاية الصحية.',
};

const SERVICES = [
  {
    slug: 'outpatient',
    title: 'العيادات الخارجية',
    description: 'نوفر عيادات خارجية في جميع التخصصات الطبية بإشراف نخبة من الاستشاريين والأخصائيين.',
    icon: <Stethoscope className="w-8 h-8 text-accent-500" />
  },
  {
    slug: 'emergency',
    title: 'الطوارئ',
    description: 'قسم طوارئ مجهز بأحدث الأجهزة يعمل على مدار 24 ساعة لاستقبال الحالات الحرجة.',
    icon: <Activity className="w-8 h-8 text-accent-500" />
  },
  {
    slug: 'icu',
    title: 'الرعاية المركزة',
    description: 'عناية فائقة وتجهيزات متطورة لمراقبة وعلاج المرضى ذوي الحالات الحرجة.',
    icon: <Heart className="w-8 h-8 text-accent-500" />
  },
  {
    slug: 'surgeries',
    title: 'العمليات الجراحية',
    description: 'غرف عمليات حديثة مجهزة لإجراء الجراحات الدقيقة والعامة بأعلى معايير التعقيم.',
    icon: <Shield className="w-8 h-8 text-accent-500" />
  },
  {
    slug: 'radiology',
    title: 'الأشعة والمعامل',
    description: 'أحدث أجهزة الأشعة التشخيصية ومعامل تحاليل معتمدة لضمان دقة وسرعة النتائج.',
    icon: <Syringe className="w-8 h-8 text-accent-500" /> // Replaced Microscope with Syringe (standard in Lucide)
  }
];

export default function ServicesPage() {
  return (
    <PublicLayout>
      <PageTitle
        title="خدماتنا"
        breadcrumbs={[
          { label: 'خدماتنا' },
        ]}
      />

      <section className="py-20 bg-gray-50/50">
        <div className="container mx-auto px-4 md:px-8 max-w-7xl">
          <div className="text-center max-w-2xl mx-auto mb-16" data-aos="fade-up">
            <h2 className="text-3xl font-bold font-montserrat text-heading mb-4">الخدمات الطبية المتكاملة</h2>
            <p className="text-default font-cairo">
              نلتزم بتقديم رعاية صحية شاملة تلبي كافة احتياجاتك الطبية من خلال منظومة متكاملة من المستشفيات والمراكز المتخصصة.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {SERVICES.map((srv, idx) => (
              <div key={srv.slug} className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-lg transition-all group" data-aos="fade-up" data-aos-delay={idx * 100}>
                <div className="w-16 h-16 rounded-xl bg-primary-50 flex items-center justify-center mb-6 group-hover:bg-primary-500 transition-colors">
                  <div className="group-hover:text-white transition-colors">
                    {srv.icon}
                  </div>
                </div>
                <h3 className="text-xl font-bold font-montserrat text-heading mb-3">{srv.title}</h3>
                <p className="text-default font-cairo text-sm leading-relaxed mb-6">
                  {srv.description}
                </p>
                <Link href={`/services/${srv.slug}`} className="inline-flex items-center gap-2 text-accent-500 font-bold font-cairo hover:text-accent-600 transition-colors">
                  التفاصيل <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
