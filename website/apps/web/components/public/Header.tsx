'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { NavItem } from '@/lib/public-api';
import { t } from '@/lib/utils';

interface Props { navItems: NavItem[] }

export default function Header({ navItems }: Props) {
  const [open, setOpen] = useState(false);

  const visible = navItems.filter(n => n.isVisible && !n.parentId).sort((a, b) => a.order - b.order);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-9 h-9 bg-primary-900 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">إ</span>
          </div>
          <span className="font-bold text-primary-900 text-lg hidden sm:block">منظومة إنسان</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {visible.map(item => (
            <Link
              key={item.id}
              href={item.target}
              className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-secondary-500 hover:bg-gray-50 rounded-lg transition-colors"
            >
              {t(item.label)}
            </Link>
          ))}
        </nav>

        {/* CTA + hamburger */}
        <div className="flex items-center gap-2">
          <Link
            href="/book"
            className="hidden sm:inline-flex items-center gap-1.5 bg-secondary-500 hover:bg-secondary-500/90 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            احجز موعدك
          </Link>

          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100"
            aria-label="القائمة"
          >
            {open ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
          {visible.map(item => (
            <Link
              key={item.id}
              href={item.target}
              onClick={() => setOpen(false)}
              className="block px-3 py-2.5 text-sm font-medium text-gray-700 hover:text-secondary-500 hover:bg-gray-50 rounded-lg"
            >
              {t(item.label)}
            </Link>
          ))}
          <Link
            href="/book"
            onClick={() => setOpen(false)}
            className="block mt-2 text-center bg-secondary-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl"
          >
            احجز موعدك
          </Link>
        </div>
      )}
    </header>
  );
}
