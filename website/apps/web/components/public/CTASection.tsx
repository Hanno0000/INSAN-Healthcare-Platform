import React from 'react';
import Link from 'next/link';
import { Calendar, Phone } from 'lucide-react';

interface CTAProps {
  title?: string;
  description?: string;
  primaryButtonText?: string;
  primaryButtonLink?: string;
  secondaryButtonText?: string;
  secondaryButtonLink?: string;
}

export default function CTASection({
  title = 'نحن هنا من أجلك في كل خطوة',
  description = 'سواء كنت تبحث عن فحص دوري، استشارة متخصصة، أو رعاية معقدة، منظومة إنسان تفتح أبوابها لتقديم رعاية طبية تليق بك. احجز موعدك الآن واكتشف الفارق الذي يصنعه احترام الإنسان.',
  primaryButtonText = 'احجز موعدك الآن',
  primaryButtonLink = '/book',
  secondaryButtonText = 'اتصل بنا للاستفسار',
  secondaryButtonLink = 'tel:+200000000'
}: CTAProps) {
  return (
    <section className="py-20 bg-accent-500 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white opacity-10 rounded-full blur-3xl"></div>
      </div>
      
      <div className="container mx-auto px-4 md:px-8 max-w-4xl text-center relative z-10" data-aos="zoom-in">
        <h2 className="text-3xl md:text-4xl font-bold text-white font-montserrat mb-6 leading-tight">
          {title}
        </h2>
        <p className="text-white/90 text-lg font-cairo leading-relaxed mb-10 max-w-2xl mx-auto">
          {description}
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 font-cairo">
          <Link href={primaryButtonLink} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-accent-500 font-bold px-8 py-4 rounded-pill shadow-floating hover:bg-light-bg hover:scale-105 transition-all">
            <Calendar className="w-5 h-5" />
            {primaryButtonText}
          </Link>
          <a href={secondaryButtonLink} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-transparent text-white font-bold px-8 py-4 rounded-pill border-2 border-white hover:bg-white hover:text-accent-500 transition-all">
            <Phone className="w-5 h-5" />
            {secondaryButtonText}
          </a>
        </div>
      </div>
    </section>
  );
}
