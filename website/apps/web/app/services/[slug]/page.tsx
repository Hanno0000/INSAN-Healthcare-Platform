import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PublicLayout from '@/components/public/PublicLayout';
import PageTitle from '@/components/public/PageTitle';
import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

const SERVICES: Record<string, { title: string; description: string; benefits: string[] }> = {
  outpatient: {
    title: 'العيادات الخارجية',
    description: 'توفر مستشفياتنا وعياداتنا مجمعات عيادات خارجية تغطي جميع التخصصات الطبية، من الباطنة والقلب إلى الجلدية والأسنان، لتقديم رعاية مستمرة بأعلى معايير الجودة.',
    benefits: [
      'نخبة من الاستشاريين والأخصائيين',
      'حجز مواعيد مرن إلكترونياً',
      'ملف طبي إلكتروني موحد للمريض',
      'صيدليات ومعامل ملحقة بالعيادات',
    ]
  },
  emergency: {
    title: 'الطوارئ',
    description: 'تعمل أقسام الطوارئ لدينا على مدار الساعة طوال أيام الأسبوع، ومجهزة بأحدث أجهزة الإنعاش والتدخل السريع لإنقاذ الحياة.',
    benefits: [
      'استجابة فورية للحالات الحرجة',
      'أطباء طوارئ متواجدون 24/7',
      'غرف إنعاش مجهزة بالكامل',
      'نقل إسعافي سريع',
    ]
  },
  icu: {
    title: 'الرعاية المركزة',
    description: 'نوفر وحدات عناية مركزة عامة (ICU) وعناية بالقلب (CCU) وحديثي الولادة (NICU) مجهزة لمراقبة وعلاج المرضى الذين يحتاجون رعاية حثيثة.',
    benefits: [
      'مراقبة حيوية مستمرة',
      'أجهزة تنفس صناعي متطورة',
      'طاقم تمريض متخصص في العناية الحرجة',
      'سياسات صارمة لمكافحة العدوى',
    ]
  },
  surgeries: {
    title: 'العمليات الجراحية',
    description: 'تضم منظومتنا غرف عمليات متطورة مصممة وفق أحدث المعايير العالمية، وتدعم الجراحات الدقيقة وجراحات المناظير واليوم الواحد.',
    benefits: [
      'كبائن تعقيم هواء بنظام التدفق الرقائقي',
      'أجهزة تخدير ومناظير متطورة',
      'وحدات إفاقة متكاملة',
      'فريق تخدير وجراحة ذو خبرة عالية',
    ]
  },
  radiology: {
    title: 'الأشعة والمعامل',
    description: 'نوفر خدمات تشخيصية دقيقة عبر مراكز الأشعة التداخلية والتشخيصية ومعامل التحاليل الطبية لضمان التشخيص السليم والدقيق.',
    benefits: [
      'أجهزة رنين مغناطيسي (MRI) وأشعة مقطعية (CT)',
      'تحاليل طبية شاملة ودقيقة',
      'ربط إلكتروني لنتائج الفحوصات بملف المريض',
      'سرعة في استخراج النتائج',
    ]
  }
};

interface Props {
  params: { slug: string };
}

export function generateMetadata({ params }: Props): Metadata {
  const service = SERVICES[params.slug];
  if (!service) return { title: 'خدماتنا | منظومة إنسان' };
  
  return {
    title: `${service.title} | منظومة إنسان`,
    description: service.description,
  };
}

export default function ServiceDetailPage({ params }: Props) {
  const service = SERVICES[params.slug];
  
  if (!service) {
    notFound();
  }

  return (
    <PublicLayout>
      <PageTitle
        title={service.title}
        breadcrumbs={[
          { label: 'خدماتنا', href: '/services' },
          { label: service.title },
        ]}
      />

      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 md:px-8 max-w-5xl">
          <div className="bg-gray-50 rounded-3xl p-8 md:p-12 border border-gray-100 shadow-sm" data-aos="fade-up">
            <h2 className="text-3xl font-bold font-montserrat text-heading mb-6">{service.title}</h2>
            <p className="text-lg text-default font-cairo leading-relaxed mb-10">
              {service.description}
            </p>

            <h3 className="text-xl font-bold font-montserrat text-heading mb-6">ما يميز خدماتنا:</h3>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
              {service.benefits.map((benefit, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-accent-500 shrink-0 mt-0.5" />
                  <span className="font-cairo text-default">{benefit}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap gap-4 pt-8 border-t border-gray-200">
              <Link href="/book" className="btn-primary py-3 px-8 rounded-xl font-bold font-cairo text-white bg-accent-500 hover:bg-accent-600 transition-colors">
                احجز موعداً الآن
              </Link>
              <Link href="/hospitals" className="btn-secondary py-3 px-8 rounded-xl font-bold font-cairo border-2 border-gray-200 hover:border-accent-500 hover:text-accent-500 transition-colors">
                استكشف مستشفياتنا
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
