'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { t } from '@/lib/utils';
import type { Bilingual } from '@/lib/public-api';

interface FaqItem {
  id: string;
  question: Bilingual;
  answer: Bilingual;
  order: number;
}

interface Props {
  faqsByTopic: Record<string, FaqItem[]>;
}

export default function FaqAccordion({ faqsByTopic }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <div className="space-y-16">
      {Object.entries(faqsByTopic).map(([topic, topicFaqs]) => (
        <div key={topic} className="faq-section" data-aos="fade-up">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-2xl font-bold text-heading font-montserrat">{topic}</h2>
            <div className="h-px bg-gray-200 flex-1"></div>
          </div>
          <div className="space-y-4">
            {topicFaqs.sort((a, b) => a.order - b.order).map((faq) => {
              const isOpen = openId === faq.id;
              return (
                <div 
                  key={faq.id} 
                  className={`border rounded-2xl overflow-hidden transition-all duration-300 ${
                    isOpen ? 'border-accent-500 shadow-md bg-white' : 'border-gray-100 bg-light-bg hover:border-gray-300'
                  }`}
                >
                  <button
                    onClick={() => toggle(faq.id)}
                    className="w-full flex items-center justify-between p-6 text-right focus:outline-none"
                  >
                    <h3 className={`text-lg font-bold font-cairo transition-colors ${isOpen ? 'text-accent-500' : 'text-heading'}`}>
                      {t(faq.question)}
                    </h3>
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180 text-accent-500' : ''}`} />
                  </button>
                  <div 
                    className={`transition-all duration-300 ease-in-out overflow-hidden ${
                      isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="p-6 pt-0 text-default font-cairo leading-relaxed border-t border-gray-100 mt-2">
                      {t(faq.answer)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
