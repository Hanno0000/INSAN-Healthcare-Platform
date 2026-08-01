import React from 'react';
import SectionTitle from './SectionTitle';
import { Phone, Mail, MapPin } from 'lucide-react';
import Link from 'next/link';
import { getPublicSettings } from '@/lib/public-api';

export default async function HomeContactSection() {
  const settings = await getPublicSettings();
  const getSetting = (key: string, fallback: string = '') => {
    const s = settings.find(x => x.key === key);
    return s ? s.value : fallback;
  };

  const contactEmail = getSetting('contact_email', 'info@insan-platform.com');
  const contactPhone = getSetting('contact_phone', '01234567890');
  const contactAddress = getSetting('contact_address', 'القاهرة - مصر');

  return (
    <section id="contact-section" className="py-20 bg-light-bg">
      <div className="container mx-auto px-4 md:px-8 max-w-7xl">
        <SectionTitle
          title="تواصل معنا"
          subtitle="فريقنا متاح للرد على استفساراتك وتلبية احتياجاتك الطبية"
          centered={true}
        />

        <div className="flex flex-col lg:flex-row gap-12 mt-12 bg-white rounded-card shadow-sm border border-gray-100 overflow-hidden">
          
          {/* Contact Info */}
          <div className="lg:w-1/3 bg-primary-900 text-white p-10 flex flex-col justify-center">
            <h3 className="text-2xl font-bold font-montserrat mb-8">معلومات التواصل</h3>
            
            <div className="space-y-8 font-cairo">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 text-accent-500" />
                </div>
                <div>
                  <p className="text-sm text-white/60 mb-1">الرقم الموحد</p>
                  <a href={`tel:${contactPhone.replace(/[\s-]/g, '')}`} className="text-lg font-bold hover:text-accent-500 transition-colors" dir="ltr">{contactPhone}</a>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-accent-500" />
                </div>
                <div>
                  <p className="text-sm text-white/60 mb-1">البريد الإلكتروني</p>
                  <a href={`mailto:${contactEmail}`} className="text-lg font-bold hover:text-accent-500 transition-colors">{contactEmail}</a>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-accent-500" />
                </div>
                <div>
                  <p className="text-sm text-white/60 mb-1">المقر الرئيسي</p>
                  <p className="text-lg font-bold">{contactAddress}</p>
                </div>
              </div>
            </div>
            
            <div className="mt-12 pt-8 border-t border-white/10">
              <Link href="/contact" className="inline-block bg-accent-500 hover:bg-accent-600 text-white font-bold py-3 px-8 rounded-pill transition-colors font-cairo text-sm">
                نموذج التواصل السريع
              </Link>
            </div>
          </div>
          
          {/* Map removed per requirements */}
          <div className="lg:w-2/3 min-h-[400px] bg-gray-50 flex items-center justify-center rounded-r-none rounded-l-card border-l border-t border-b border-gray-100">
            <div className="text-center p-8">
              <h4 className="text-2xl font-bold font-montserrat text-heading mb-4">نحن أقرب إليك</h4>
              <p className="text-default font-cairo max-w-md mx-auto">
                منظومة إنسان توفر فروعاً ومراكز طبية متعددة لتسهيل وصولك للرعاية الصحية في أي وقت وأي مكان.
                <br /><br />
                يمكنك تصفح صفحة كل مستشفى على حدة للاطلاع على الخريطة التفاعلية والاتجاهات الدقيقة.
              </p>
            </div>
          </div>
          
        </div>
      </div>
    </section>
  );
}
