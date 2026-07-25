import Link from 'next/link';
import type { NavItem } from '@/lib/public-api';
import { t } from '@/lib/utils';

interface Props { navItems: NavItem[] }

export default function Footer({ navItems }: Props) {
  const visible = navItems.filter(n => n.isVisible).sort((a, b) => a.order - b.order);
  const year = new Date().getFullYear();

  return (
    <footer className="bg-primary-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 bg-secondary-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">إ</span>
              </div>
              <span className="font-bold text-lg">منظومة إنسان</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              المنظومة الصحية المتكاملة — نربط المرضى بأفضل الكفاءات الطبية في مصر.
            </p>
          </div>

          {/* Nav links */}
          <div>
            <h3 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">روابط سريعة</h3>
            <ul className="space-y-2">
              {visible.slice(0, 8).map(item => (
                <li key={item.id}>
                  <Link href={item.target} className="text-gray-400 hover:text-white text-sm transition-colors">
                    {t(item.label)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">تواصل معنا</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">نموذج التواصل</Link>
              </li>
              <li>
                <Link href="/book" className="hover:text-white transition-colors">حجز موعد</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-gray-500">
          <span>© {year} منظومة إنسان للرعاية الصحية. جميع الحقوق محفوظة.</span>
          <div className="flex gap-4">
            <Link href="/contact" className="hover:text-gray-300 transition-colors">سياسة الخصوصية</Link>
            <Link href="/contact" className="hover:text-gray-300 transition-colors">شروط الاستخدام</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
