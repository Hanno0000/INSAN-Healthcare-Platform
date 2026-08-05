import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Target, Heart, Shield, Award, Users, Activity } from 'lucide-react';
import PublicLayout from '@/components/public/PublicLayout';
import PageTitle from '@/components/public/PageTitle';
import WhyChooseUsSection from '@/components/public/WhyChooseUsSection';
import CTASection from '@/components/public/CTASection';

export const metadata: Metadata = {
  title: 'عن منظومة إنسان | الرعاية الصحية المتكاملة',
  description: 'تعرف على قصة منظومة إنسان ورؤيتنا في تقديم أفضل خدمات الرعاية الصحية في مصر بلمسة إنسانية وتكنولوجيا طبية متقدمة.',
};

export default function AboutPage() {
  const values = [
    { icon: Heart, title: 'الرعاية الإنسانية', desc: 'نضع راحة المريض النفسية والجسدية في قمة أولوياتنا.' },
    { icon: Shield, title: 'الثقة والأمان', desc: 'نلتزم بأعلى معايير الجودة ومكافحة العدوى العالمية.' },
    { icon: Award, title: 'التميز الطبي', desc: 'نخبة من الكفاءات الطبية المدعومة بأحدث التكنولوجيا.' },
    { icon: Users, title: 'العمل الجماعي', desc: 'فريق طبي متكامل يعمل بتناغم للوصول لأفضل نتيجة.' },
  ];

  return (
    <PublicLayout>
      <PageTitle 
        title="عن منظومة إنسان" 
        breadcrumbs={[{ label: 'عن المنظومة' }]} 
      />
      
      {/* Our Story Section */}
      <section className="py-20 lg:py-32 bg-white relative overflow-hidden">
        <div className="container mx-auto px-4 md:px-8 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div data-aos="fade-left">
              <span className="text-accent-500 font-bold font-cairo tracking-wider uppercase text-sm mb-4 block">منظومة رعاية صحية متكاملة</span>
              <h2 className="text-3xl md:text-5xl font-bold text-heading font-montserrat mb-6 leading-tight">
                أساس الخدمة الطبية <span className="text-accent-500">احترام الإنسان</span>
              </h2>
              <div className="space-y-4 text-default font-cairo text-lg leading-relaxed">
                <p>
                  نحن لسنا مجرد مستشفيات تقدم خدمات طبية مفرقة. نحن منصة (إنسان) التي تدير وتطور <strong>منظومة رعاية صحية متكاملة (Healthcare Ecosystem)</strong>.
                </p>
                <p>
                  المريض لدينا لا يدخل مجرد مستشفى، بل يدخل مظلة متكاملة تضمن له كافة التخصصات عبر مراكزنا الطبية المتطورة (مثل مستشفى المستقبل ومستشفى الدلتا). نحن نطبق معايير طبية وتشغيلية موحدة في كل مكان نذهب إليه، لنؤسس لعلاقة طويلة المدى مبنية على الاحترافية، الجودة، والثقة المطلقة.
                </p>
              </div>
              <div className="mt-10 flex gap-4">
                <div className="border-r-4 border-accent-500 pr-4">
                  <h4 className="text-3xl font-bold text-heading font-montserrat">15+</h4>
                  <span className="text-sm text-gray-500 font-cairo">عاماً من الخبرة</span>
                </div>
                <div className="border-r-4 border-accent-500 pr-4">
                  <h4 className="text-3xl font-bold text-heading font-montserrat">50K+</h4>
                  <span className="text-sm text-gray-500 font-cairo">مريض تم شفاؤه</span>
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

      {/* Vision & Mission */}
      <section className="py-20 bg-light-bg relative">
        <div className="container mx-auto px-4 md:px-8 max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-10 rounded-2xl shadow-sm hover:shadow-xl transition-shadow duration-300 border border-gray-100 relative overflow-hidden group" data-aos="fade-up" data-aos-delay="100">
              <div className="absolute top-0 right-0 w-2 h-full bg-accent-500 transition-all duration-300 group-hover:w-full group-hover:opacity-5"></div>
              <div className="w-16 h-16 bg-accent-50 rounded-2xl flex items-center justify-center text-accent-500 mb-6 group-hover:scale-110 transition-transform">
                <Target className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-heading font-montserrat mb-4">رؤيتنا</h3>
              <p className="text-default font-cairo leading-relaxed">
                أن نكون المنصة الرائدة للرعاية الصحية في مصر، من خلال بناء وإدارة مؤسسات طبية ومراكز متخصصة تحت نظام تشغيلي موحد (Ecosystem). نهدف إلى ربط المستشفيات، الأطباء، والمرضى تحت مظلة واحدة يثق بها الجميع.
              </p>
            </div>
            
            <div className="bg-white p-10 rounded-2xl shadow-sm hover:shadow-xl transition-shadow duration-300 border border-gray-100 relative overflow-hidden group" data-aos="fade-up" data-aos-delay="200">
              <div className="absolute top-0 right-0 w-2 h-full bg-blue-500 transition-all duration-300 group-hover:w-full group-hover:opacity-5"></div>
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 mb-6 group-hover:scale-110 transition-transform">
                <Activity className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-heading font-montserrat mb-4">رسالتنا</h3>
              <p className="text-default font-cairo leading-relaxed">
                تقديم تجربة استشفائية تتمحور حول الإنسان، مع الالتزام التام باحترام إنسانية المريض في كل مرحلة. الحفاظ على أعلى معايير الجودة وسلامة المرضى بشفافية مطلقة، وتطبيق بروتوكولات طبية متطورة توفر الرعاية الكاملة للمريض وذويه.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-20 lg:py-32 bg-white">
        <div className="container mx-auto px-4 md:px-8 max-w-7xl text-center">
          <div className="mb-16 max-w-2xl mx-auto" data-aos="fade-up">
            <h2 className="text-3xl md:text-4xl font-bold text-heading font-montserrat mb-4">قيمنا الأساسية</h2>
            <p className="text-default font-cairo text-lg">
              الأسس التي نعتمد عليها في كل قرار نتخذه وفي كل تفاعل مع مرضانا.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((v, idx) => {
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

      <WhyChooseUsSection />
      <CTASection />
    </PublicLayout>
  );
}
