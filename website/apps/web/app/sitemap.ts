import type { MetadataRoute } from 'next';
import { getHospitals, getMedicalCenters, getDoctors, getNewsPosts } from '@/lib/public-api';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://insan-platform.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [hospitals, centers, doctors, news] = await Promise.all([
    getHospitals({ pageSize: 500 }),
    getMedicalCenters({ pageSize: 500 }),
    getDoctors({ pageSize: 500 }),
    getNewsPosts({ pageSize: 500 }),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/hospitals`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/medical-centers`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/doctors`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/news`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/book`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
  ];

  const hospitalRoutes: MetadataRoute.Sitemap = (hospitals?.data ?? []).map(h => ({
    url: `${BASE}/hospitals/${h.slug}`,
    lastModified: new Date(h.updatedAt ?? Date.now()),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const centerRoutes: MetadataRoute.Sitemap = (centers?.data ?? []).map(c => ({
    url: `${BASE}/medical-centers/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const doctorRoutes: MetadataRoute.Sitemap = (doctors?.data ?? []).map(d => ({
    url: `${BASE}/doctors/${d.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const newsRoutes: MetadataRoute.Sitemap = (news?.data ?? []).map(p => ({
    url: `${BASE}/news/${p.slug}`,
    lastModified: p.publishedAt ? new Date(p.publishedAt) : new Date(),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [...staticRoutes, ...hospitalRoutes, ...centerRoutes, ...doctorRoutes, ...newsRoutes];
}
