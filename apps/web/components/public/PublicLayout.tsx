import { getNavigation } from '@/lib/public-api';
import Header from './Header';
import Footer from './Footer';

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [headerNav, footerNav] = await Promise.all([
    getNavigation('header'),
    getNavigation('footer'),
  ]);

  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="bg-white text-gray-900 font-sans antialiased">
        <Header navItems={headerNav} />
        <main>{children}</main>
        <Footer navItems={footerNav} />
      </body>
    </html>
  );
}
