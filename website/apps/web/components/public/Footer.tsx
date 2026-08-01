import Link from 'next/link';
import type { NavItem } from '@/lib/public-api';
import { t } from '@/lib/utils';
import { Facebook, Twitter, Instagram, Linkedin, ArrowRight } from 'lucide-react';

interface Props { 
  navItems: NavItem[];
  settings?: any[];
}

export default function Footer({ navItems, settings = [] }: Props) {
  const getSetting = (key: string, fallback: string = '') => {
    const s = settings.find(x => x.key === key);
    return s ? s.value : fallback;
  };

  const contactEmail = getSetting('contact_email', 'info@insan-platform.com');
  const contactPhone = getSetting('contact_phone', '+20 000 000 000');
  const contactAddress = getSetting('contact_address', 'القاهرة، مصر');
  const facebookUrl = getSetting('facebook_url', '#');
  const twitterUrl = getSetting('twitter_url', '#');
  const instagramUrl = getSetting('instagram_url', '#');
  const linkedinUrl = getSetting('linkedin_url', '#');

  const visible = navItems.filter(n => n.isVisible).sort((a, b) => a.order - b.order);
  const year = new Date().getFullYear();

  return (
    <footer className="footer bg-dark-bg text-gray-300">
      <div className="footer-top py-16 border-b border-white/10 relative">
        <div className="container mx-auto px-4 md:px-8 max-w-7xl">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            
            {/* Brand Column */}
            <div className="footer-about">
              <Link href="/" className="flex items-center gap-2 mb-6">
                <div className="w-9 h-9 bg-accent-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">إ</span>
                </div>
                <span className="font-bold text-white text-2xl tracking-tight font-montserrat">
                  INSAN
                </span>
              </Link>
              <p className="text-sm leading-relaxed mb-6 font-cairo">
                المنظومة الصحية المتكاملة — نربط المرضى بأفضل الكفاءات الطبية في مصر من خلال مستشفياتنا المتخصصة ومراكزنا الطبية المتميزة.
              </p>
              <div className="social-links flex gap-3">
                <a href={twitterUrl} className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center hover:bg-accent-500 hover:text-white transition-all"><Twitter className="w-4 h-4" /></a>
                <a href={facebookUrl} className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center hover:bg-accent-500 hover:text-white transition-all"><Facebook className="w-4 h-4" /></a>
                <a href={instagramUrl} className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center hover:bg-accent-500 hover:text-white transition-all"><Instagram className="w-4 h-4" /></a>
                <a href={linkedinUrl} className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center hover:bg-accent-500 hover:text-white transition-all"><Linkedin className="w-4 h-4" /></a>
              </div>
            </div>

            {/* Quick Links Column */}
            <div className="nav-column">
              <h6 className="text-white font-semibold mb-6 uppercase tracking-wider font-montserrat text-sm">روابط سريعة</h6>
              <nav className="flex flex-col gap-3 font-cairo text-sm">
                {visible.map(n => (
                  <Link key={n.id} href={n.target} className="flex items-center gap-2 hover:text-accent-500 transition-colors">
                    <ArrowRight className="w-3 h-3 rtl:rotate-180" /> {t(n.label)}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Resources Column */}
            <div className="nav-column">
              <h6 className="text-white font-semibold mb-6 uppercase tracking-wider font-montserrat text-sm">خدماتنا</h6>
              <nav className="flex flex-col gap-3 font-cairo text-sm">
                <Link href="/services/outpatient" className="flex items-center gap-2 hover:text-accent-500 transition-colors">
                  <ArrowRight className="w-3 h-3 rtl:rotate-180" /> العيادات الخارجية
                </Link>
                <Link href="/services/emergency" className="flex items-center gap-2 hover:text-accent-500 transition-colors">
                  <ArrowRight className="w-3 h-3 rtl:rotate-180" /> الطوارئ
                </Link>
                <Link href="/services/icu" className="flex items-center gap-2 hover:text-accent-500 transition-colors">
                  <ArrowRight className="w-3 h-3 rtl:rotate-180" /> الرعاية المركزة
                </Link>
                <Link href="/services/surgeries" className="flex items-center gap-2 hover:text-accent-500 transition-colors">
                  <ArrowRight className="w-3 h-3 rtl:rotate-180" /> العمليات الجراحية
                </Link>
                <Link href="/services/radiology" className="flex items-center gap-2 hover:text-accent-500 transition-colors">
                  <ArrowRight className="w-3 h-3 rtl:rotate-180" /> الأشعة والمعامل
                </Link>
              </nav>
            </div>

            {/* Contact Column */}
            <div className="nav-column">
              <h6 className="text-white font-semibold mb-6 uppercase tracking-wider font-montserrat text-sm">تواصل معنا</h6>
              <div className="flex flex-col gap-4 font-cairo text-sm">
                <p>
                  <strong>العنوان:</strong><br />
                  {contactAddress}
                </p>
                <p>
                  <strong>هاتف:</strong><br />
                  <a href={`tel:${contactPhone.replace(/[\s-]/g, '')}`} className="hover:text-accent-500 transition-colors">{contactPhone}</a>
                </p>
                <p>
                  <strong>البريد الإلكتروني:</strong><br />
                  <a href={`mailto:${contactEmail}`} className="hover:text-accent-500 transition-colors">{contactEmail}</a>
                </p>
              </div>
            </div>

            {/* Investors Box inside Footer */}
            <div className="nav-column lg:col-span-1">
              <div className="bg-[#0B1F3A] border border-gray-700/50 rounded-xl p-6 h-full flex flex-col justify-center items-center text-center shadow-lg relative overflow-hidden">
                {/* Decorative bg element */}
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-accent-500/10 rounded-full blur-xl pointer-events-none"></div>
                
                <h6 className="text-accent-500 font-bold mb-3 font-montserrat text-lg">للمستثمرين</h6>
                <p className="text-gray-300 font-cairo text-xs leading-relaxed mb-5">
                  للاطلاع على الفرص الاستثمارية والملف التعريفي للمجموعة
                </p>
                <Link 
                  href="/investors" 
                  className="bg-transparent border border-accent-500 text-accent-500 hover:bg-accent-500 hover:text-white font-bold py-2 px-6 rounded-lg transition-colors font-cairo text-sm w-full"
                >
                  اضغط هنا
                </Link>
              </div>
            </div>

          </div>
        </div>
      </div>

      <div className="footer-bottom py-6 bg-dark-surface text-sm font-cairo text-gray-400">
        <div className="container mx-auto px-4 md:px-8 max-w-7xl flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="copyright">
            <p>© {year} <span className="font-semibold text-white">منظومة إنسان للرعاية الصحية</span>. جميع الحقوق محفوظة.</p>
          </div>
          <div className="legal-links flex gap-6">
            <Link href="/privacy" className="hover:text-white transition-colors">سياسة الخصوصية</Link>
            <Link href="/terms" className="hover:text-white transition-colors">شروط الاستخدام</Link>
            <Link href="/investors" className="hover:text-white transition-colors">بوابة المستثمرين</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
