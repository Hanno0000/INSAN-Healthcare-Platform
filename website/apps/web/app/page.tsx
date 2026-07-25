import type { Metadata } from 'next';
import Link from 'next/link';
import PublicLayout from '@/components/public/PublicLayout';
import SectionTitle from '@/components/public/SectionTitle';
import HospitalCard from '@/components/public/HospitalCard';
import MedicalCenterCard from '@/components/public/MedicalCenterCard';
import DoctorCard from '@/components/public/DoctorCard';
import NewsCard from '@/components/public/NewsCard';
import TestimonialCard from '@/components/public/TestimonialCard';
import {
  getHospitals, getMedicalCenters, getDoctors,
  getNewsPosts, getTestimonials,
} from '@/lib/public-api';

export const metadata: Metadata = {
  title: 'منظومة إنسان للرعاية الصحية',
  description: 'المنظومة الصحية المتكاملة — نربط المرضى بأفضل الكفاءات الطبية في مصر',
};

export default async function HomePage() {
  const [hospitals, centers, doctors, news, testimonials] = await Promise.all([
    getHospitals({ pageSize: 4 }),
    getMedicalCenters({ pageSize: 6 }),
    getDoctors({ pageSize: 6 }),
    getNewsPosts({ pageSize: 4 }),
    getTestimonials({ pageSize: 6 }),
  ]);

  return (
    <PublicLayout>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-primary-900 text-white">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-secondary-500/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[600px] h-[400px] rounded-full bg-accent-500/5 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm text-white/80 mb-6">
              <span className="w-2 h-2 rounded-full bg-secondary-500 animate-pulse" />
              المنظومة الصحية المتكاملة في مصر
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-6">
              رعاية صحية{' '}
              <span className="text-secondary-500">إنسانية</span>{' '}
              تليق بك
            </h1>
            <p className="text-white/70 text-lg leading-relaxed mb-8 max-w-xl">
              منظومة إنسان تجمع أفضل المستشفيات والمراكز الطبية والأطباء تحت سقف واحد —
              لأن صحتك تستحق الأفضل.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/book"
                className="bg-secondary-500 hover:bg-secondary-500/90 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
              >
                احجز موعدك الآن
              </Link>
              <Link
                href="/hospitals"
                className="bg-white/10 hover:bg-white/20 text-white font-semibold px-6 py-3 rounded-xl transition-colors border border-white/20"
              >
                استكشف المستشفيات
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl">
            {[
              { value: hospitals?.meta.total ?? 0, label: 'مستشفى' },
              { value: centers?.meta.total ?? 0, label: 'مركز طبي' },
              { value: doctors?.meta.total ?? 0, label: 'طبيب متخصص' },
              { value: '٢٤/٧', label: 'دعم مستمر' },
            ].map((s, i) => (
              <div key={i} className="bg-white/10 rounded-2xl p-4 text-center border border-white/10">
                <div className="text-2xl font-bold text-white">{s.value}</div>
                <div className="text-white/60 text-xs mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Hospitals ────────────────────────────────────────────── */}
      {hospitals && hospitals.data.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-end justify-between mb-10">
              <SectionTitle
                title="مستشفياتنا"
                subtitle="منظومة من أرقى المستشفيات تعمل بمعايير دولية"
                centered={false}
              />
              <Link href="/hospitals" className="text-secondary-500 hover:underline text-sm font-medium shrink-0 mb-2">
                عرض الكل
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {hospitals.data.map(h => <HospitalCard key={h.id} hospital={h} />)}
            </div>
          </div>
        </section>
      )}

      {/* ── Featured Medical Centers ──────────────────────────────────────── */}
      {centers && centers.data.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-end justify-between mb-10">
              <SectionTitle
                title="المراكز الطبية"
                subtitle="تخصصات متنوعة وخدمات شاملة في أماكن قريبة منك"
                centered={false}
              />
              <Link href="/medical-centers" className="text-secondary-500 hover:underline text-sm font-medium shrink-0 mb-2">
                عرض الكل
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {centers.data.map(c => <MedicalCenterCard key={c.id} center={c} />)}
            </div>
          </div>
        </section>
      )}

      {/* ── Featured Doctors ──────────────────────────────────────────────── */}
      {doctors && doctors.data.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-end justify-between mb-10">
              <SectionTitle
                title="نخبة أطبائنا"
                subtitle="أفضل الكفاءات الطبية في مختلف التخصصات"
                centered={false}
              />
              <Link href="/doctors" className="text-secondary-500 hover:underline text-sm font-medium shrink-0 mb-2">
                عرض الكل
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {doctors.data.map(d => <DoctorCard key={d.id} doctor={d} />)}
            </div>
          </div>
        </section>
      )}

      {/* ── Latest News ───────────────────────────────────────────────────── */}
      {news && news.data.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-end justify-between mb-10">
              <SectionTitle
                title="آخر الأخبار"
                subtitle="تابع أحدث أخبار منظومة إنسان والمجال الطبي"
                centered={false}
              />
              <Link href="/news" className="text-secondary-500 hover:underline text-sm font-medium shrink-0 mb-2">
                عرض الكل
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <NewsCard post={news.data[0]} featured />
              <div className="grid grid-cols-1 gap-5">
                {news.data.slice(1, 3).map(p => <NewsCard key={p.id} post={p} />)}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Testimonials ──────────────────────────────────────────────────── */}
      {testimonials && testimonials.data.length > 0 && (
        <section className="py-16 bg-primary-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <SectionTitle
              title="ماذا يقولون عنّا"
              subtitle="آراء حقيقية من أطباء ومرضى وشركاء منظومة إنسان"
              light
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {testimonials.data.map(tm => <TestimonialCard key={tm.id} testimonial={tm} />)}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA Section ───────────────────────────────────────────────────── */}
      <section className="py-16 bg-gradient-to-r from-secondary-500 to-primary-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">ابدأ رحلتك الصحية اليوم</h2>
          <p className="text-white/80 text-lg mb-8 leading-relaxed">
            احجز موعدك مع أفضل الأطباء أو تواصل مع فريقنا للحصول على الدعم الذي تحتاجه.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/book"
              className="bg-white text-primary-900 hover:bg-gray-100 font-semibold px-8 py-3 rounded-xl transition-colors"
            >
              احجز موعداً
            </Link>
            <Link
              href="/contact"
              className="bg-transparent border border-white/40 hover:bg-white/10 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
            >
              تواصل معنا
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
