import { cookies } from 'next/headers';
import type { Metadata } from 'next';
import { LocaleProvider } from '@/components/LocaleProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'INSAN Healthcare Platform',
  description: 'INSAN — Integrated Egyptian Healthcare Ecosystem',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'ar';
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="text-gray-900 font-sans antialiased">
        <LocaleProvider locale={locale as 'ar' | 'en'}>
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
