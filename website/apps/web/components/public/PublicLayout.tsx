import { getNavigation } from '@/lib/public-api';
import Header from './Header';
import Footer from './Footer';

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [headerNav, footerNav] = await Promise.all([
    getNavigation('header'),
    getNavigation('footer'),
  ]);

  return (
    <div className="bg-white min-h-screen flex flex-col">
      <Header navItems={headerNav} />
      <main className="flex-1">{children}</main>
      <Footer navItems={footerNav} />
    </div>
  );
}
