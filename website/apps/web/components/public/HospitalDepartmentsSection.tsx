import Link from 'next/link';
import SectionTitle from './SectionTitle';
import { t } from '@/lib/utils';
import type { HospitalDepartment } from '@/lib/public-api';
import { ArrowRight } from 'lucide-react';

interface Props {
  hospitalSlug: string;
  departments: HospitalDepartment[];
}

export default function HospitalDepartmentsSection({ hospitalSlug, departments }: Props) {
  if (!departments || departments.length === 0) return null;

  const colsClass = departments.length === 1 ? 'lg:grid-cols-1' :
    departments.length === 2 ? 'lg:grid-cols-2' :
    departments.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4';

  return (
    <section className="py-20 lg:py-24 bg-light-bg">
      <div className="container mx-auto px-4 md:px-8 max-w-7xl">
        <SectionTitle
          title="أقسام المستشفى المتاحة"
          subtitle="تعرّف على الأقسام الطبية المتخصصة المتوفرة في هذا المستشفى"
          centered={true}
        />

        <div className={`grid grid-cols-1 md:grid-cols-2 ${colsClass} gap-6 mt-12`}>
          {departments.map((dept) => (
            <Link
              key={dept.slug}
              href={`/hospitals/${hospitalSlug}/departments/${dept.slug}`}
              className="group bg-white rounded-card border border-gray-100 shadow-sm hover:shadow-floating transition-all duration-300 overflow-hidden flex flex-col h-full"
            >
              <div className="aspect-video w-full overflow-hidden bg-light-bg flex items-center justify-center">
                {dept.image ? (
                  <img src={dept.image} alt={t(dept.name)} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <span className="text-4xl font-bold text-accent-500/40 font-montserrat">
                    {t(dept.name).charAt(0)}
                  </span>
                )}
              </div>
              <div className="p-6 flex flex-col flex-1">
                <h4 className="text-lg font-bold text-heading font-montserrat mb-2 group-hover:text-accent-500 transition-colors">
                  {t(dept.name)}
                </h4>
                {dept.shortDescription && (
                  <p className="text-default font-cairo text-sm leading-relaxed mb-4 flex-1">
                    {t(dept.shortDescription)}
                  </p>
                )}
                <span className="inline-flex items-center gap-1 text-sm font-bold text-heading group-hover:text-accent-500 transition-colors font-cairo mt-auto">
                  اكتشف القسم <ArrowRight className="w-3 h-3 rtl:rotate-180" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
