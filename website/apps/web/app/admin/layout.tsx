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
    <div className="bg-gray-50 min-h-screen">
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </div>
  );
}
