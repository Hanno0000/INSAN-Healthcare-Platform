import { getNavigation } from '@/lib/public-api';
import Header from './Header';
import Footer from './Footer';
import StickyActionsBar from './StickyActionsBar';
import AIChatWidget from './AIChatWidget';

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [headerNav, footerNav] = await Promise.all([
    getNavigation('header'),
    getNavigation('footer'),
  ]);

  return (
    <div className="bg-white min-h-screen flex flex-col">
      <Header navItems={headerNav} />
      <main className="flex-1 pt-[120px] md:pt-[160px]">{children}</main>
      <Footer navItems={footerNav} />
      <StickyActionsBar />
      <AIChatWidget />
    </div>
  );
}
