import type { Metadata } from 'next';
import PublicLayout from '@/components/public/PublicLayout';
import ContactForm from '@/components/public/ContactForm';

export const metadata: Metadata = {
  title: 'تواصل معنا | منظومة إنسان',
  description: 'تواصل مع فريق منظومة إنسان للاستفسار أو الدعم',
};

export default function ContactPage() {
  return (
    <PublicLayout>
      {/* Header */}
      <section className="bg-primary-900 text-white py-14">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">تواصل معنا</h1>
          <p className="text-white/70 text-lg">
            فريقنا جاهز للرد على استفساراتك وتقديم الدعم الذي تحتاجه.
          </p>
        </div>
      </section>

      {/* Form + info */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Info cards */}
            <div className="space-y-4">
              {[
                { icon: '📍', title: 'العنوان', text: 'مصر — المنصورة، القاهرة، والإسكندرية' },
                { icon: '📞', title: 'الهاتف', text: 'تواصل عبر النموذج' },
                { icon: '⏰', title: 'أوقات العمل', text: 'السبت – الخميس: ٨ ص – ٨ م' },
              ].map((c, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start gap-4">
                  <div className="text-2xl">{c.icon}</div>
                  <div>
                    <p className="font-semibold text-primary-900 text-sm mb-1">{c.title}</p>
                    <p className="text-gray-500 text-sm">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Form */}
            <div className="lg:col-span-2">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
