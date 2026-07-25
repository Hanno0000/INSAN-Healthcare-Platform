import type { Metadata } from 'next';
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
  return children;
}
