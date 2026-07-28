import React from 'react';
import Link from 'next/link';

interface Props {
  title: string;
  breadcrumbs: { label: string; href?: string }[];
}

export default function PageTitle({ title, breadcrumbs }: Props) {
  return (
    <div className="page-title py-16 bg-light-bg border-b border-gray-100 text-center" data-aos="fade">
      <div className="container mx-auto px-4 max-w-7xl">
        <h1 className="text-4xl font-bold text-heading font-montserrat mb-4">{title}</h1>
        <nav className="flex justify-center" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-2 space-x-reverse font-cairo text-sm text-default">
            <li className="inline-flex items-center">
              <Link href="/" className="hover:text-accent-500 transition-colors">
                الرئيسية
              </Link>
            </li>
            {breadcrumbs.map((item, index) => (
              <li key={index} className="inline-flex items-center">
                <svg className="w-4 h-4 mx-2 text-gray-400 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                {item.href ? (
                  <Link href={item.href} className="hover:text-accent-500 transition-colors">
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-gray-500 font-semibold">{item.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </div>
  );
}
