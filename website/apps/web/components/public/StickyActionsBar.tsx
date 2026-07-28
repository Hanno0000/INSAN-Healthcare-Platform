'use client';

import Link from 'next/link';
import { Phone, Calendar, MessageCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function StickyActionsBar() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={`fixed bottom-0 left-0 w-full z-[9999] transition-transform duration-300 ${isVisible ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}`}>
      {/* On desktop we might want it visible always, or we can make it floating on the side. 
          The requirement is: "3 أزرار ثابتة: طوارئ، حجز، واتساب". 
          We'll make it a full-width bottom bar on mobile, and a side-floating widget on desktop. */}
      
      {/* Mobile Bottom Bar */}
      <div className="md:hidden flex w-full bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.1)] h-16">
        <a href="tel:+200000000" className="flex-1 flex flex-col items-center justify-center text-red-600 hover:bg-red-50 transition-colors border-r border-gray-100">
          <Phone className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-bold">طوارئ</span>
        </a>
        <Link href="/book" className="flex-1 flex flex-col items-center justify-center text-accent-500 hover:bg-light-bg transition-colors border-r border-gray-100">
          <Calendar className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-bold">احجز موعد</span>
        </Link>
        <a href="https://wa.me/200000000" target="_blank" rel="noopener noreferrer" className="flex-1 flex flex-col items-center justify-center text-green-600 hover:bg-green-50 transition-colors">
          <MessageCircle className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-bold">واتساب</span>
        </a>
      </div>

      {/* Desktop Floating Sidebar */}
      <div className="hidden md:flex flex-col gap-2 fixed bottom-8 right-8 z-[9999]">
        <a href="tel:+200000000" className="group flex items-center justify-center w-14 h-14 bg-red-600 text-white rounded-full shadow-floating hover:bg-red-700 transition-colors relative" aria-label="الطوارئ">
          <Phone className="w-6 h-6" />
          <span className="absolute right-full mr-4 bg-white text-red-600 px-3 py-1 rounded shadow-sm text-sm font-bold opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap">الطوارئ (24/7)</span>
        </a>
        <Link href="/book" className="group flex items-center justify-center w-14 h-14 bg-accent-500 text-white rounded-full shadow-floating hover:bg-accent-600 transition-colors relative" aria-label="احجز موعد">
          <Calendar className="w-6 h-6" />
          <span className="absolute right-full mr-4 bg-white text-accent-500 px-3 py-1 rounded shadow-sm text-sm font-bold opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap">احجز موعد</span>
        </Link>
        <a href="https://wa.me/200000000" target="_blank" rel="noopener noreferrer" className="group flex items-center justify-center w-14 h-14 bg-green-600 text-white rounded-full shadow-floating hover:bg-green-700 transition-colors relative" aria-label="تواصل عبر الواتساب">
          <MessageCircle className="w-6 h-6" />
          <span className="absolute right-full mr-4 bg-white text-green-600 px-3 py-1 rounded shadow-sm text-sm font-bold opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap">تواصل عبر الواتساب</span>
        </a>
      </div>
    </div>
  );
}
