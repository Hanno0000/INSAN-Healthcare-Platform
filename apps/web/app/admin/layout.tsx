import type { Metadata } from 'next';
import AdminLayoutClient from './AdminLayoutClient';

export const metadata: Metadata = {
  title: {
    template: '%s | INSAN Admin',
    default: 'INSAN Admin Panel',
  },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="bg-gray-50 text-gray-900 font-sans antialiased">
        <AdminLayoutClient>{children}</AdminLayoutClient>
      </body>
    </html>
  );
}
