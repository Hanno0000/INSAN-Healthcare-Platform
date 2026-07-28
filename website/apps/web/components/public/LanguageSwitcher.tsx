'use client';

import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher() {
  const router = useRouter();
  
  // Read current locale from cookie or default to 'ar'
  const currentLocale = Cookies.get('NEXT_LOCALE') || 'ar';

  const toggleLanguage = () => {
    const newLocale = currentLocale === 'ar' ? 'en' : 'ar';
    Cookies.set('NEXT_LOCALE', newLocale, { expires: 365, path: '/' });
    
    // Hard refresh to apply the new locale in server components and layout
    window.location.reload();
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 hover:text-accent-500 transition-colors font-semibold text-sm bg-white/10 px-3 py-1.5 rounded-pill"
      title={currentLocale === 'ar' ? 'Switch to English' : 'التبديل للعربية'}
    >
      <Globe className="w-4 h-4" />
      <span>{currentLocale === 'ar' ? 'EN' : 'عربي'}</span>
    </button>
  );
}
