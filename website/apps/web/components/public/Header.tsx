'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { NavItem } from '@/lib/public-api';
import { useT } from '@/components/LocaleProvider';
import { Mail, Phone, Menu, X, ChevronDown } from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';

interface Props { 
  navItems: NavItem[];
  settings?: any[];
}

export default function Header({ navItems, settings = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const t = useT();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const visible = navItems.filter(n => n.isVisible && !n.parentId).sort((a, b) => a.order - b.order);

  const getSetting = (key: string, fallback: string = '') => {
    const s = settings.find(x => x.key === key);
    return s ? s.value : fallback;
  };

  const contactEmail = getSetting('contact_email', 'info@insan-platform.com');
  const contactPhone = getSetting('contact_phone', '+20 000 000 000');
  const emergencyPhone = getSetting('emergency_phone', '+20 000 000 000');
  // Derived, never hand-written: a wa.me link is the phone number with its
  // leading zero dropped and 20 prepended, not the digits glued on as-is —
  // see business/brand/CONTACT_DIRECTORY.md §2.
  const whatsappNumber = getSetting('whatsapp_number', '01500668657').replace(/[\s-]/g, '');
  const whatsappUrl = `https://wa.me/20${whatsappNumber.replace(/^0/, '')}`;

  return (
    <header id="header" className={`fixed top-0 w-full z-50 transition-all duration-300 bg-white shadow-sm`}>
      {/* Top Bar */}
      {!scrolled && (
        <div className="hidden md:flex align-items-center bg-primary-900 text-gray-300 text-xs py-2 px-4 md:px-8 w-full items-center justify-between">
          <div className="flex gap-4">
            <a href={`mailto:${contactEmail}`} className="flex items-center gap-1.5 hover:text-white transition-colors">
              <Mail className="w-3.5 h-3.5" /> {contactEmail}
            </a>
            <a href={`tel:${contactPhone.replace(/[\s-]/g, '')}`} className="flex items-center gap-1.5 hover:text-white transition-colors">
              <Phone className="w-3.5 h-3.5" /> {contactPhone}
            </a>
          </div>
          <div className="flex gap-3 items-center">
            <LanguageSwitcher />
          </div>
        </div>
      )}

      <div className={`branding flex items-center justify-between px-4 md:px-8 mx-auto max-w-7xl transition-all duration-300 ${scrolled ? 'py-3' : 'py-4'}`}>
        
        {/* Logo — the "Egyptian Healthcare Platform" tagline is baked into this
            PNG as small type (the file is a wide 4267×1916 lockup). Below
            ~h-20 that caption shrinks to a couple of pixels tall and becomes
            unreadable, which is why it looked "missing" — it was never
            actually a rendering bug, just too small to read. */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <img src={getSetting('logo_light', '/logos/insan-logo-color.png')} alt="منظومة إنسان - Egyptian Healthcare Platform" className="h-16 md:h-20 w-auto object-contain" />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          <ul className="flex items-center gap-6 font-lato text-default font-medium font-cairo">
            {visible.map(n => (
              <li key={n.id}>
                <Link href={n.target} className="hover:text-accent-500 transition-colors">
                  {t(n.label)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* CTA & Mobile Toggle */}
        <div className="flex items-center gap-3">
          {/* Emergency */}
          <a href={`tel:${emergencyPhone.replace(/[\s-]/g, '')}`} className="hidden lg:inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold px-5 py-2.5 rounded-pill shadow-sm transition-all duration-300 font-cairo">
            <Phone className="w-4 h-4" /> للطوارئ
          </a>
          
          {/* Book */}
          <Link href="/book" className="hidden lg:inline-flex items-center gap-2 bg-accent-500 hover:bg-accent-600 text-white text-sm font-bold px-5 py-2.5 rounded-pill shadow-sm transition-all duration-300 font-cairo">
            احجز موعد
          </Link>
          
          {/* WhatsApp */}
          <a href={whatsappUrl} target="_blank" rel="noreferrer" className="hidden lg:inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-bold px-5 py-2.5 rounded-pill shadow-sm transition-all duration-300 font-cairo">
            <Phone className="w-4 h-4" /> واتساب
          </a>
          
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 text-heading focus:outline-none"
            aria-label="القائمة"
          >
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white shadow-floating border-t border-gray-100 py-4 px-4 flex flex-col gap-4 z-50">
          <ul className="flex flex-col gap-4 font-cairo font-medium text-default">
            {visible.map(n => (
              <li key={n.id}>
                <Link href={n.target} onClick={() => setOpen(false)} className="block hover:text-accent-500 transition-colors">
                  {t(n.label)}
                </Link>
              </li>
            ))}
            <li><Link href="/faq" onClick={() => setOpen(false)} className="block hover:text-accent-500 transition-colors mt-4 pt-4 border-t border-gray-100">الأسئلة الشائعة</Link></li>
            <li><Link href="/gallery" onClick={() => setOpen(false)} className="block hover:text-accent-500 transition-colors">المعرض</Link></li>
            <li>
              <Link
                href="/book"
                onClick={() => setOpen(false)}
                className="inline-block mt-2 bg-accent-500 text-white text-sm font-semibold px-6 py-2 rounded-pill shadow-card-hover text-center"
              >
                احجز موعد
              </Link>
            </li>
            <li>
              <div className="flex justify-center mt-4">
                <LanguageSwitcher />
              </div>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
