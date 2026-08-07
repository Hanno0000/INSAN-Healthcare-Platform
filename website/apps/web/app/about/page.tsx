import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Target, Heart, Shield, Award, Users, Activity, Network, Building2, CheckCircle2, Stethoscope, ChevronRight } from 'lucide-react';
import PublicLayout from '@/components/public/PublicLayout';
import PageTitle from '@/components/public/PageTitle';
import CTASection from '@/components/public/CTASection';

export const metadata: Metadata = {
  title: 'عن منظومة إنسان | الرعاية الصحية المتكاملة',
  description: 'نحن منظومة مصرية متكاملة للرعاية الصحية، نربط بين المستشفيات، والمراكز الطبية التخصصية، والكوادر الطبية، والمرضى تحت مظلة واحدة موثوقة.',
};

export default function AboutPage() {
  const philosophy = [
    { icon: Heart, title: 'احترام وقتك', desc: 'نعمل بجد لتقليل أوقات الانتظار وجعل مسارك العلاجي واضحاً ومنظماً.' },
    { icon: Activity, title: 'لغة تفهمها', desc: 'نشرح لك حالتك والخيارات المتاحة بلغة واضحة وشفافة، لأنك شريك في اتخاذ القرار.' },
    { icon: Shield, title: 'الرعاية الضرورية فقط', desc: 'نلتزم بأعلى درجات الأمانة الطبية، فلا نقترح أبداً إجراءً لا تحتاجه.' },
    { icon: Users, title: 'الكرامة أولاً', desc: 'حماية كرامة المريض وخصوصيته هي قاعدة أساسية لا تهاون فيها.' },
  ];

  const leadership = [
    { title: 'مراكز متخصصة بدلاً من الأقسام', desc: 'رحلة المريض لا تحترم حدود الأقسام الإدارية. لذا، قمنا بتحويل الأقسام إلى مراكز متكاملة تجمع كافة التخصصات والخدمات المطلوبة لتجربة المريض في وجهة واحدة.' },
    { title: 'أنظمة متكاملة لا تعتمد على الأفراد فقط', desc: 'المؤسسة التي تعتمد جودتها على أفراد بعينهم هي مؤسسة تعتمد على الحظ. في إنسان، الجودة منظومة كاملة تُدرب وتُراقب وتُقاس لضمان نفس المستوى في كل وقت.' },
    { title: 'الاتساق هو معيار الجودة الحقيقي', desc: 'لا نركز فقط على الوصول للقمة في حالات نادرة، بل نضمن أن يكون مستوى الرعاية الأساسي والمستمر هو الأفضل دائمًا وفي جميع المستشفيات.' },
    { title: 'الإدارة كاختصاص طبي', desc: 'التنسيق والتسليم ومكافحة العدوى تحدد نتائج العلاج بشكل مباشر. لذا، نعتبر الإدارة وظيفة طبية وليست عبئاً إدارياً.' }
  ];

  return (
    <PublicLayout>
      <PageTitle 
        title="عن منظومة إنسان" 
        breadcrumbs={[{ label: 'عن المنظومة' }]} 
      />
      
      {/* 1. Hero & Story Section */}
      <section className="py-20 lg:py-32 bg-white relative overflow-hidden">
        <div className="container mx-auto px-4 md:px-8 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div data-aos="fade-left">
              <span className="text-accent-500 font-bold font-cairo tracking-wider uppercase text-sm mb-4 block">منظومة إنسان للرعاية الصحية</span>
              <h2 className="text-3xl md:text-5xl font-bold text-heading font-montserrat mb-6 leading-tight">
                أساس الخدمة الطبية <span className="text-accent-500">احترام الإنسان</span>
              </h2>
              <div className="space-y-4 text-default font-cairo text-lg leading-relaxed">
                <p>
                  نحن منظومة مصرية متكاملة للرعاية الصحية، نربط بين المستشفيات، والمراكز الطبية التخصصية، والكوادر الطبية، والمرضى تحت مظلة واحدة موثوقة. في "إنسان"، لا نقدم الرعاية كخدمة مجردة، بل كالتزام يحترم وقت المريض، ويشركه في القرار، ويحفظ كرامته.
                </p>
                <p>
                  "إنسان" ليست مجرد مستشفى، بل هي منصة شاملة لإدارة وتطوير وتحويل مؤسسات الرعاية الصحية. نعمل على توحيد معايير الجودة والتشغيل لتوفير مسار علاجي سلس وآمن، يبدأ من العيادات الخارجية والمراكز المتخصصة، وصولاً إلى غرف العمليات ووحدات العناية المركزة.
                </p>
              </div>
              {/* 2. Stats Section */}
              <div className="mt-10 flex gap-6">
                <div className="border-r-4 border-accent-500 pr-4">
                  <h4 className="text-3xl font-bold text-heading font-montserrat">2</h4>
                  <span className="text-sm text-gray-500 font-cairo">مستشفى دولي ومتخصص</span>
                </div>
                <div className="border-r-4 border-accent-500 pr-4">
                  <h4 className="text-3xl font-bold text-heading font-montserrat">12</h4>
                  <span className="text-sm text-gray-500 font-cairo">مركزاً طبياً متخصصاً</span>
                </div>
              </div>
            </div>
            
            <div className="relative" data-aos="fade-right">
              <div className="rounded-2xl overflow-hidden shadow-2xl relative z-10">
                <img 
                  src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=1000&auto=format&fit=crop" 
                  alt="فريق طبي منظومة إنسان" 
                  className="w-full h-auto object-cover hover:scale-105 transition-transform duration-700"
                />
              </div>
              <div className="absolute -bottom-8 -right-8 w-64 h-64 bg-accent-50 rounded-full -z-10 blur-3xl opacity-50"></div>
              <div className="absolute -top-8 -left-8 w-40 h-40 bg-blue-50 rounded-full -z-10 blur-2xl opacity-50"></div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 & 4. The INSAN Network (Hospitals & Centers) Section */}
      <section className="py-20 bg-light-bg relative">
        <div className="container mx-auto px-4 md:px-8 max-w-7xl">
          <div className="text-center max-w-3xl mx-auto mb-16" data-aos="fade-up">
            <h2 className="text-3xl md:text-4xl font-bold text-heading font-montserrat mb-6">شبكة "إنسان"</h2>
            <p className="text-lg text-default font-cairo leading-relaxed">
              نحن ندير ونوجه مجموعة من أبرز المستشفيات والمراكز المتخصصة، لضمان أعلى مستويات الرعاية عبر نظام تشغيلي وهوية واحدة تضع المريض دائماً في المركز:
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-shadow duration-300 border border-gray-100 group" data-aos="fade-up" data-aos-delay="100">
              <div className="w-14 h-14 bg-accent-50 rounded-xl flex items-center justify-center text-accent-500 mb-6 group-hover:bg-accent-500 group-hover:text-white transition-colors">
                <Building2 className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-heading font-montserrat mb-3">مستشفى المستقبل التخصصي</h3>
              <p className="text-default font-cairo leading-relaxed mb-6">
                رمز القيادة والابتكار، توفر رعاية متقدمة عبر أحدث التقنيات الطبية وأفضل الكوادر.
              </p>
              <Link href="/hospitals/future" className="inline-flex items-center text-accent-500 font-bold font-cairo group-hover:text-accent-600">
                المزيد <ChevronRight className="w-4 h-4 mr-1" />
              </Link>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-shadow duration-300 border border-gray-100 group" data-aos="fade-up" data-aos-delay="200">
              <div className="w-14 h-14 bg-accent-50 rounded-xl flex items-center justify-center text-accent-500 mb-6 group-hover:bg-accent-500 group-hover:text-white transition-colors">
                <Shield className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-heading font-montserrat mb-3">مستشفى الدلتا الدولي</h3>
              <p className="text-default font-cairo leading-relaxed mb-6">
                إعادة بناء الثقة، من خلال تقديم خدمات طبية موثوقة وآمنة تناسب احتياجات المجتمع.
              </p>
              <Link href="/hospitals/delta" className="inline-flex items-center text-accent-500 font-bold font-cairo group-hover:text-accent-600">
                المزيد <ChevronRight className="w-4 h-4 mr-1" />
              </Link>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-shadow duration-300 border border-gray-100 group" data-aos="fade-up" data-aos-delay="300">
              <div className="w-14 h-14 bg-accent-50 rounded-xl flex items-center justify-center text-accent-500 mb-6 group-hover:bg-accent-500 group-hover:text-white transition-colors">
                <Network className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-heading font-montserrat mb-3">المراكز الطبية المتخصصة</h3>
              <p className="text-default font-cairo leading-relaxed mb-6">
                ندير 12 مركزاً طبياً متخصصاً، تعمل جميعها بمعايير "إنسان" الطبية الفائقة لتقديم رعاية متصلة.
              </p>
              <Link href="/medical-centers" className="inline-flex items-center text-accent-500 font-bold font-cairo group-hover:text-accent-600">
                المزيد <ChevronRight className="w-4 h-4 mr-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Why INSAN (Care Philosophy) Section */}
      <section className="py-20 lg:py-32 bg-white">
        <div className="container mx-auto px-4 md:px-8 max-w-7xl text-center">
          <div className="mb-16 max-w-2xl mx-auto" data-aos="fade-up">
            <h2 className="text-3xl md:text-4xl font-bold text-heading font-montserrat mb-4">فلسفتنا في الرعاية</h2>
            <p className="text-default font-cairo text-lg leading-relaxed">
              كل قرار طبي وإداري في منظومة إنسان ينبع من فلسفة واضحة:
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {philosophy.map((v, idx) => {
              const Icon = v.icon;
              return (
                <div key={idx} className="p-8 rounded-2xl bg-light-bg hover:bg-accent-500 hover:text-white transition-colors duration-300 group" data-aos="fade-up" data-aos-delay={idx * 100}>
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-accent-500 mx-auto mb-6 shadow-sm group-hover:text-accent-500">
                    <Icon className="w-8 h-8" />
                  </div>
                  <h4 className="text-xl font-bold font-montserrat mb-3 group-hover:text-white text-heading">{v.title}</h4>
                  <p className="font-cairo text-default group-hover:text-white/90 text-sm leading-relaxed">{v.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. Healthcare Leadership Section */}
      <section className="py-20 lg:py-32 bg-gray-50 border-t border-gray-100 relative">
        <div className="container mx-auto px-4 md:px-8 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div data-aos="fade-left">
              <h2 className="text-3xl md:text-4xl font-bold text-heading font-montserrat mb-6">الريادة في الرعاية الصحية</h2>
              <p className="text-default font-cairo text-lg leading-relaxed mb-8">
                نحن لا ندير المستشفيات وحسب، بل نقدم نموذجاً حديثاً لتشغيل وتطوير الرعاية الصحية في مصر، نؤمن من خلاله بأن جودة الطب تكمن في متانة النظام الإداري والطبي الذي يقف خلفه.
              </p>
              
              <div className="space-y-6">
                {leadership.map((item, idx) => (
                  <div key={idx} className="flex gap-4 items-start bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="mt-1 shrink-0">
                      <CheckCircle2 className="w-6 h-6 text-accent-500" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-heading font-montserrat mb-2">{item.title}</h4>
                      <p className="text-default font-cairo text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative" data-aos="fade-right">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4 mt-8">
                  <div className="rounded-2xl overflow-hidden shadow-lg h-56">
                    <img src="https://images.unsplash.com/photo-1551076805-e1869033e561?q=80&w=1000&auto=format&fit=crop" alt="رعاية متصلة" className="w-full h-full object-cover" />
                  </div>
                  <div className="rounded-2xl overflow-hidden shadow-lg h-64 bg-accent-50 p-6 flex flex-col justify-center items-center text-center border border-accent-100">
                    <Stethoscope className="w-12 h-12 text-accent-500 mb-4" />
                    <h4 className="text-xl font-bold text-heading font-montserrat mb-2">رعاية متصلة</h4>
                    <p className="text-sm text-default font-cairo">نظام تشغيلي واحد يحكم جميع مستشفياتنا ومراكزنا.</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="rounded-2xl overflow-hidden shadow-lg h-64 bg-blue-50 p-6 flex flex-col justify-center items-center text-center border border-blue-100">
                    <Target className="w-12 h-12 text-blue-500 mb-4" />
                    <h4 className="text-xl font-bold text-heading font-montserrat mb-2">معايير موحدة</h4>
                    <p className="text-sm text-default font-cairo">التقييم المستمر لضمان أعلى جودة طبية في كل تفاعل.</p>
                  </div>
                  <div className="rounded-2xl overflow-hidden shadow-lg h-56">
                    <img src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=1000&auto=format&fit=crop" alt="معايير موحدة" className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. CTA Section */}
      <CTASection 
        title="صحتك تبدأ من هنا"
        description="اكتشف خدماتنا الطبية المتكاملة، وتعرّف على أطبائنا، واحجز موعدك بسهولة عبر منظومة إنسان."
        primaryButtonText="احجز موعدك الآن"
        primaryButtonLink="/book"
        secondaryButtonText="تصفح مراكزنا الطبية"
        secondaryButtonLink="/medical-centers"
      />
    </PublicLayout>
  );
}
