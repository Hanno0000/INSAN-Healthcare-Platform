// Server-side only — NO 'use client'
// Used by all public pages for ISR data fetching.

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1';
const REVALIDATE = 60; // seconds

function buildUrl(path: string, params?: Record<string, any>): string {
  const url = new URL(`${API_BASE}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, String(v));
      }
    }
  }
  return url.toString();
}

async function pub<T>(path: string, params?: Record<string, any>, dynamic = false): Promise<T | null> {
  try {
    const res = await fetch(buildUrl(path, params), dynamic
      ? { cache: 'no-store' }
      : { next: { revalidate: REVALIDATE } },
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Bilingual { ar: string; en: string }
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}
export interface SingleResponse<T> { success: boolean; data: T }

export interface HeroStat {
  value: string;
  suffix?: string;
  label: Bilingual;
}
export interface HospitalDepartment {
  slug: string;
  name: Bilingual;
  shortDescription?: Bilingual;
  description?: Bilingual;
  image?: string;
  doctorIds?: string[];
}
export interface HospitalLocation {
  name: Bilingual;
  mapsUrl: string;
}
export interface HospitalContactInfo {
  phone?: string;
  email?: string;
  address?: Bilingual;
}
export interface JourneyStep {
  icon: string;
  image?: string;
  link?: string;
  title: Bilingual;
  desc: Bilingual;
}

export interface Hospital {
  id: string; slug: string; name: Bilingual;
  shortDescription: Bilingual; description: Bilingual;
  logoUrl?: string; heroImage?: string; brandColor?: string;
  metaTitle?: Bilingual; metaDescription?: Bilingual;
  status: string; customFields?: Record<string, any>;
  googleMapsUrl?: string;
  createdAt?: string; updatedAt?: string;

  // الحقول الستة الجديدة
  heroTagline?: Bilingual;
  heroStats?: HeroStat[];
  departments?: HospitalDepartment[];
  locations?: HospitalLocation[];
  contactInfo?: HospitalContactInfo;
  journeySteps?: JourneyStep[];

  // علاقات تأتي من findBySlug
  medicalCenters?: { medicalCenter: {
    id: string; slug: string; name: Bilingual; heroImage?: string; isFeatured?: boolean;
    clinics?: { id: string; name: Bilingual; schedule: any }[];
  } }[];
  doctors?: { doctor: {
    id: string; slug: string; name: Bilingual; specialty?: Bilingual; photo?: string;
  } }[];
  newsPosts?: {
    id: string; slug: string; title: Bilingual; excerpt?: Bilingual;
    featuredImage?: string; publishedAt?: string;
  }[];
}
export interface MedicalCenter {
  id: string; slug: string; name: Bilingual;
  shortDescription?: Bilingual; description?: Bilingual;
  logoUrl?: string; heroImage?: string; brandColor?: string;
  metaTitle?: Bilingual; metaDescription?: Bilingual;
  status: string; hospitals?: Hospital[];
}
export interface Clinic {
  id: string; name: Bilingual; description?: Bilingual;
  workingHours?: string; phone?: string; floor?: string;
}
export interface Doctor {
  id: string; slug: string; name: Bilingual;
  specialty?: Bilingual; bio?: Bilingual;
  photo?: string; qualifications?: string;
  metaTitle?: Bilingual; metaDescription?: Bilingual;
  status: string; hospitals?: Hospital[]; medicalCenters?: MedicalCenter[];
}
export interface NewsCategory { id: string; slug: string; name: Bilingual }
export interface NewsPost {
  id: string; slug: string; title: Bilingual;
  excerpt?: Bilingual; content?: Bilingual;
  coverImage?: string; publishedAt?: string;
  metaTitle?: Bilingual; metaDescription?: Bilingual;
  status: string; category?: NewsCategory;
}
export interface NavItem {
  id: string; label: Bilingual; target: string;
  parentId?: string; order: number; isVisible: boolean;
  children?: NavItem[];
}
export interface Testimonial {
  id: string; name: Bilingual; quote: Bilingual;
  photo?: string; audience: string; order: number;
  hospital?: { name: Bilingual };
}
export interface CmsPage {
  id: string; slug: string; title: Bilingual;
  metaTitle?: Bilingual; metaDescription?: Bilingual;
  sections: CmsSection[];
}
export interface CmsSection {
  id: string; type: string; order: number;
  content: Record<string, any>;
}
export interface FaqItem {
  id: string;
  topic: Bilingual;
  question: Bilingual;
  answer: Bilingual;
  order: number;
}

// ─── Public API calls ─────────────────────────────────────────────────────────

export async function getHospitals(params?: { page?: number; pageSize?: number; search?: string }) {
  // Use dynamic (no-store) when a search query is present
  return pub<PaginatedResponse<Hospital>>('/hospitals', params, !!params?.search);
}
export async function getHospital(slug: string) {
  return pub<SingleResponse<Hospital>>(`/hospitals/${slug}`);
}

export async function getMedicalCenters(params?: { page?: number; pageSize?: number; search?: string }) {
  return pub<PaginatedResponse<MedicalCenter>>('/medical-centers', params, !!params?.search);
}
export async function getMedicalCenter(slug: string) {
  return pub<SingleResponse<MedicalCenter>>(`/medical-centers/${slug}`);
}

export async function getBookingQuestions(centerId: string) {
  return pub<SingleResponse<any[]>>(`/medical-centers/${centerId}/questions`, {}, true);
}

export async function getDoctors(params?: { page?: number; pageSize?: number; search?: string; hospitalId?: string }) {
  return pub<PaginatedResponse<Doctor>>('/doctors', params, !!params?.search);
}
export async function getDoctor(slug: string) {
  return pub<SingleResponse<Doctor>>(`/doctors/${slug}`);
}

export async function getNewsCategories() {
  return pub<PaginatedResponse<NewsCategory>>('/news-categories', { pageSize: 50 });
}
export async function getNewsPosts(params?: { page?: number; pageSize?: number; categoryId?: string; search?: string }) {
  return pub<PaginatedResponse<NewsPost>>('/news', params, !!params?.search);
}
export async function getNewsPost(slug: string) {
  return pub<SingleResponse<NewsPost>>(`/news/${slug}`);
}

export async function getNavigation(location: 'header' | 'footer' = 'header') {
  const res = await pub<SingleResponse<NavItem[]>>('/navigation', { location });
  return res?.data ?? [];
}

export async function getTestimonials(params?: { pageSize?: number }) {
  return pub<PaginatedResponse<Testimonial>>('/testimonials', params);
}

export async function getCmsPage(slug: string) {
  return pub<SingleResponse<CmsPage>>(`/pages/${slug}`);
}

export async function getFaqs(params?: { pageSize?: number; search?: string }) {
  return pub<PaginatedResponse<FaqItem>>('/faqs', params, !!params?.search);
}
