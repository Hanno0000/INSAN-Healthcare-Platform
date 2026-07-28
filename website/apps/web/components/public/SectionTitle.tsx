import React from 'react';

interface Props {
  title: string;
  subtitle?: string;
  centered?: boolean;
  light?: boolean;
}

export default function SectionTitle({ title, subtitle, centered = true, light = false }: Props) {
  return (
    <div className={`section-title ${centered ? 'text-center' : 'text-right'} mb-10`} data-aos="fade-up">
      <h2 className={`font-montserrat ${light ? 'text-white' : 'text-heading'}`}>
        {title}
      </h2>
      {subtitle && (
        <p className={`font-cairo text-lg max-w-3xl ${centered ? 'mx-auto' : ''} ${light ? 'text-gray-300' : 'text-default'}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
