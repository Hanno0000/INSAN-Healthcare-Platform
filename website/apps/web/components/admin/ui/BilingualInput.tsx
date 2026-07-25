'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import { inputCls, textareaCls } from './FormField';

interface Props {
  arValue: string;
  enValue: string;
  onArChange: (v: string) => void;
  onEnChange: (v: string) => void;
  placeholder?: { ar?: string; en?: string };
  multiline?: boolean;
  rows?: number;
  error?: string;
}

export default function BilingualInput({
  arValue, enValue, onArChange, onEnChange,
  placeholder, multiline, rows = 3, error,
}: Props) {
  const [tab, setTab] = useState<'ar' | 'en'>('ar');

  return (
    <div>
      {/* Tabs */}
      <div className="flex mb-2 bg-gray-100 rounded-lg p-0.5 w-fit gap-0.5">
        {(['ar', 'en'] as const).map((lang) => (
          <button
            key={lang}
            type="button"
            onClick={() => setTab(lang)}
            className={clsx(
              'px-3 py-1 text-xs font-medium rounded-md transition',
              tab === lang ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {lang === 'ar' ? 'عربي' : 'English'}
          </button>
        ))}
      </div>

      {/* Input */}
      {tab === 'ar' ? (
        multiline ? (
          <textarea
            dir="rtl"
            value={arValue}
            onChange={(e) => onArChange(e.target.value)}
            placeholder={placeholder?.ar}
            rows={rows}
            className={clsx(textareaCls, error && 'border-red-400')}
          />
        ) : (
          <input
            dir="rtl"
            value={arValue}
            onChange={(e) => onArChange(e.target.value)}
            placeholder={placeholder?.ar}
            className={clsx(inputCls, error && 'border-red-400')}
          />
        )
      ) : multiline ? (
        <textarea
          dir="ltr"
          value={enValue}
          onChange={(e) => onEnChange(e.target.value)}
          placeholder={placeholder?.en}
          rows={rows}
          className={clsx(textareaCls, 'font-latin')}
        />
      ) : (
        <input
          dir="ltr"
          value={enValue}
          onChange={(e) => onEnChange(e.target.value)}
          placeholder={placeholder?.en}
          className={clsx(inputCls, 'font-latin')}
        />
      )}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
