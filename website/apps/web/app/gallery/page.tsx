import type { Metadata } from 'next';
import PublicLayout from '@/components/public/PublicLayout';
import PageTitle from '@/components/public/PageTitle';
import EmptyState from '@/components/public/EmptyState';
import { getHospitals, getMedicalCenters, getDoctors } from '@/lib/public-api';

export const metadata: Metadata = {
  title: 'المعرض | منظومة إنسان',
  description: 'معرض صور منظومة إنسان — مستشفيات، مراكز طبية، وأطباء.',
};

export default async function GalleryPage() {
  const [hospitalsRes, centersRes, doctorsRes] = await Promise.all([
    getHospitals({ pageSize: 50 }),
    getMedicalCenters({ pageSize: 50 }),
    getDoctors({ pageSize: 50 }),
  ]);

  const hospitals = hospitalsRes?.data || [];
  const centers = centersRes?.data || [];
  const doctors = doctorsRes?.data || [];

  // Extract images
  const hospitalImages = hospitals
    .filter(h => h.heroImage)
    .map(h => ({ url: h.heroImage!, title: typeof h.name === 'string' ? h.name : (h.name as any).ar, category: 'مستشفيات' }));
    
  const centerImages = centers
    .filter(c => c.heroImage)
    .map(c => ({ url: c.heroImage!, title: typeof c.name === 'string' ? c.name : (c.name as any).ar, category: 'مراكز طبية' }));

  const doctorImages = doctors
    .filter(d => d.photo)
    .map(d => ({ url: d.photo!, title: typeof d.name === 'string' ? d.name : (d.name as any).ar, category: 'أطباء' }));

  const allImages = [...hospitalImages, ...centerImages, ...doctorImages];

  return (
    <PublicLayout>
      <PageTitle 
        title="المعرض" 
        breadcrumbs={[{ label: 'المعرض' }]} 
      />

      <section className="py-20 bg-white min-h-[60vh]">
        <div className="container mx-auto px-4 md:px-8 max-w-7xl">
          
          {allImages.length > 0 ? (
            <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-6 space-y-6">
              {allImages.map((img, index) => (
                <div key={index} className="break-inside-avoid group relative rounded-card overflow-hidden shadow-sm hover:shadow-floating border border-gray-100 transition-all duration-300">
                  <img src={img.url} alt={img.title} className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                    <span className="text-accent-500 text-xs font-bold font-cairo mb-1">{img.category}</span>
                    <h4 className="text-white font-bold font-montserrat text-lg leading-tight">{img.title}</h4>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState 
              title="لا توجد صور حالياً"
              description="لم يتم إضافة صور للمعرض بعد."
              icon="🖼️"
            />
          )}

        </div>
      </section>
    </PublicLayout>
  );
}
