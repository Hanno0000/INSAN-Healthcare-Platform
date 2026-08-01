import { getNavigation, getPublicSettings } from '@/lib/public-api';
import Header from './Header';
import Footer from './Footer';
import StickyActionsBar from './StickyActionsBar';
import AIChatWidget from './AIChatWidget';

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [headerNav, footerNav, settings] = await Promise.all([
    getNavigation('header'),
    getNavigation('footer'),
    getPublicSettings()
  ]);

  return (
    <div className="bg-white min-h-screen flex flex-col">
      <Header navItems={headerNav} settings={settings} />
      <main className="flex-1 pt-[120px] md:pt-[160px]">{children}</main>
      <Footer navItems={footerNav} settings={settings} />
      <StickyActionsBar />
      <AIChatWidget />
    </div>
  );
}
