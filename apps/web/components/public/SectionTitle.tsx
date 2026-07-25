interface Props {
  title: string;
  subtitle?: string;
  centered?: boolean;
  light?: boolean;
}

export default function SectionTitle({ title, subtitle, centered = true, light = false }: Props) {
  return (
    <div className={`mb-10 ${centered ? 'text-center' : ''}`}>
      <h2 className={`text-2xl sm:text-3xl font-bold mb-3 ${light ? 'text-white' : 'text-primary-900'}`}>
        {title}
      </h2>
      {subtitle && (
        <p className={`text-base max-w-2xl ${centered ? 'mx-auto' : ''} ${light ? 'text-white/70' : 'text-gray-500'}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
