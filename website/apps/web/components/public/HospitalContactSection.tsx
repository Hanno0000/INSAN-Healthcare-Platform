'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Phone, Mail, MapPin, Calendar } from 'lucide-react';
import { t } from '@/lib/utils';
import type { Bilingual, HospitalContactInfo, HospitalLocation } from '@/lib/public-api';

const MAPS_EMBED_RE = /^https:\/\/(www\.)?google\.com\/maps\/embed/;

interface Props {
  hospitalId: string;
  contactInfo?: HospitalContactInfo;
  locations?: HospitalLocation[];
  fallbackMapUrl?: string;
}

export default function HospitalContactSection({ hospitalId, contactInfo, locations, fallbackMapUrl }: Props) {
  const [active, setActive] = useState(0);

  const tabs: HospitalLocation[] = (locations && locations.length > 0)
    ? locations
    : (fallbackMapUrl ? [{ name: { ar: 'الموقع', en: 'Location' } as Bilingual, mapsUrl: fallbackMapUrl }] : []);

  const hasContactInfo = !!(contactInfo?.phone || contactInfo?.email || contactInfo?.address);
  if (!hasContactInfo && tabs.length === 0) return null;

  const activeUrl = tabs[active]?.mapsUrl || '';
  const isValidMapUrl = MAPS_EMBED_RE.test(activeUrl);

  return (
    <section id="contact-section" className="py-20 bg-light-bg">
      <div className="container mx-auto px-4 md:px-8 max-w-7xl">
        <div className="flex flex-col lg:flex-row gap-0 bg-white rounded-card shadow-sm border border-gray-100 overflow-hidden">

          {/* Contact Info */}
          {hasContactInfo && (
            <div className={`${tabs.length > 0 ? 'lg:w-1/3' : 'w-full'} bg-primary-900 text-white p-10 flex flex-col justify-center`}>
              <h3 className="text-2xl font-bold font-montserrat mb-8">تواصل معنا</h3>

              <div className="space-y-8 font-cairo">
                {contactInfo?.phone && (
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <Phone className="w-5 h-5 text-accent-500" />
                    </div>
                    <div>
                      <p className="text-sm text-white/60 mb-1">الهاتف</p>
                      <a href={`tel:${contactInfo.phone}`} className="text-lg font-bold hover:text-accent-500 transition-colors" dir="ltr">
                        {contactInfo.phone}
                      </a>
                    </div>
                  </div>
                )}

                {contactInfo?.email && (
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <Mail className="w-5 h-5 text-accent-500" />
                    </div>
                    <div>
                      <p className="text-sm text-white/60 mb-1">البريد الإلكتروني</p>
                      <a href={`mailto:${contactInfo.email}`} className="text-lg font-bold hover:text-accent-500 transition-colors">
                        {contactInfo.email}
                      </a>
                    </div>
                  </div>
                )}

                {contactInfo?.address && t(contactInfo.address) && (
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 text-accent-500" />
                    </div>
                    <div>
                      <p className="text-sm text-white/60 mb-1">العنوان</p>
                      <p className="text-lg font-bold">{t(contactInfo.address)}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-12 pt-8 border-t border-white/10">
                <Link
                  href={`/book?hospitalId=${hospitalId}`}
                  className="inline-flex items-center gap-2 bg-accent-500 hover:bg-accent-600 text-white font-bold py-3 px-8 rounded-pill transition-colors font-cairo text-sm"
                >
                  <Calendar className="w-4 h-4" />
                  احجز موعداً
                </Link>
              </div>
            </div>
          )}

          {/* Locations / Map */}
          {tabs.length > 0 && (
            <div className={`${hasContactInfo ? 'lg:w-2/3' : 'w-full'} flex flex-col`}>
              {tabs.length > 1 && (
                <div className="flex flex-wrap gap-2 p-6 pb-0">
                  {tabs.map((loc, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setActive(i)}
                      className={`px-4 py-2 text-sm font-bold rounded-pill transition font-cairo ${
                        active === i
                          ? 'bg-accent-500 text-white'
                          : 'bg-white text-heading border border-gray-200 hover:border-accent-300'
                      }`}
                    >
                      {t(loc.name)}
                    </button>
                  ))}
                </div>
              )}

              <div className="p-6 flex-1">
                <div className="w-full h-[400px] rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                  {isValidMapUrl ? (
                    <iframe
                      src={activeUrl}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      sandbox="allow-scripts allow-same-origin allow-popups"
                      title={t(tabs[active]?.name)}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-50 flex items-center justify-center text-sm text-gray-400 font-cairo">
                      لا يوجد رابط خريطة صالح
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </section>
  );
}
