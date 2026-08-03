'use client';

const API_BASE = (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') 
  ? '/api/v1' 
  : (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1');

// In-memory access token store (never localStorage)
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

interface ApiOptions extends RequestInit {
  skipAuth?: boolean;
}

export async function apiRequest<T = any>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const { skipAuth, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string> || {}),
  };

  if (!skipAuth && accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers,
    credentials: 'include',
    cache: 'no-store',
  });

  // Auto-refresh if 401
  if (response.status === 401 && !skipAuth && !path.includes('/auth/refresh')) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${accessToken}`;
      const retryResponse = await fetch(`${API_BASE}${path}`, {
        ...fetchOptions,
        headers,
        credentials: 'include',
        cache: 'no-store',
      });
      return parseResponse<T>(retryResponse);
    }
  }

  return parseResponse<T>(response);
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let data: any;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON response: ${text.slice(0, 100)}`);
  }

  if (!response.ok) {
    throw new ApiError(
      data?.error?.message || 'Request failed',
      response.status,
      data?.error?.code,
    );
  }

  return data;
}

async function tryRefresh(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      setAccessToken(data?.data?.accessToken || null);
      return true;
    }
  } catch {
    // Refresh failed
  }

  setAccessToken(null);
  return false;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function qs(params: Record<string, any> = {}): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    if (typeof v === 'object' && !Array.isArray(v)) {
      for (const [fk, fv] of Object.entries(v)) {
        if (fv !== undefined && fv !== null && fv !== '') p.append(`${k}[${fk}]`, String(fv));
      }
    } else {
      p.append(k, String(v));
    }
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

type Paginated<T> = { success: true; data: T[]; meta: { page: number; pageSize: number; total: number; totalPages: number } };
type Single<T> = { success: true; data: T };

// ─── API ──────────────────────────────────────────────────────────────────────
export const api = {
  // Auth
  auth: {
    login: (email: string, password: string) =>
      apiRequest<Single<{ accessToken: string; user: any }>>('/auth/login', {
        method: 'POST', body: JSON.stringify({ email, password }), skipAuth: true,
      }),
    logout: () => apiRequest('/auth/logout', { method: 'POST' }),
    me: () => apiRequest<Single<any>>('/auth/me'),
    refresh: () => apiRequest<Single<{ accessToken: string }>>('/auth/refresh', { method: 'POST', skipAuth: true }),
    updateProfile: (body: any) => apiRequest<Single<any>>('/auth/profile', { method: 'PATCH', body: JSON.stringify(body) }),
  },

  // Hospitals
  hospitals: {
    list: (params?: any) => apiRequest<Paginated<any>>(`/admin/hospitals${qs(params)}`),
    get: (id: string) => apiRequest<Single<any>>(`/admin/hospitals/${id}`),
    create: (body: any) => apiRequest<Single<any>>('/admin/hospitals', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: any) => apiRequest<Single<any>>(`/admin/hospitals/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    publish: (id: string) => apiRequest<Single<any>>(`/admin/hospitals/${id}/publish`, { method: 'POST' }),
    unpublish: (id: string) => apiRequest<Single<any>>(`/admin/hospitals/${id}/unpublish`, { method: 'POST' }),
    delete: (id: string) => apiRequest(`/admin/hospitals/${id}`, { method: 'DELETE' }),
  },

  // Medical Centers
  medicalCenters: {
    list: (params?: any) => apiRequest<Paginated<any>>(`/admin/medical-centers${qs(params)}`),
    get: (id: string) => apiRequest<Single<any>>(`/admin/medical-centers/${id}`),
    create: (body: any) => apiRequest<Single<any>>('/admin/medical-centers', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: any) => apiRequest<Single<any>>(`/admin/medical-centers/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    publish: (id: string) => apiRequest<Single<any>>(`/admin/medical-centers/${id}/publish`, { method: 'POST' }),
    unpublish: (id: string) => apiRequest<Single<any>>(`/admin/medical-centers/${id}/unpublish`, { method: 'POST' }),
    delete: (id: string) => apiRequest(`/admin/medical-centers/${id}`, { method: 'DELETE' }),
    // Clinics
    listClinics: (centerId: string) => apiRequest<Single<any[]>>(`/admin/medical-centers/${centerId}/clinics`),
    createClinic: (centerId: string, body: any) => apiRequest<Single<any>>(`/admin/medical-centers/${centerId}/clinics`, { method: 'POST', body: JSON.stringify(body) }),
    updateClinic: (centerId: string, id: string, body: any) => apiRequest<Single<any>>(`/admin/medical-centers/${centerId}/clinics/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    deleteClinic: (centerId: string, id: string) => apiRequest(`/admin/medical-centers/${centerId}/clinics/${id}`, { method: 'DELETE' }),
    // Questions
    listQuestions: (centerId: string) => apiRequest<Single<any[]>>(`/admin/medical-centers/${centerId}/questions`),
    createQuestion: (centerId: string, body: any) => apiRequest<Single<any>>(`/admin/medical-centers/${centerId}/questions`, { method: 'POST', body: JSON.stringify(body) }),
    updateQuestion: (centerId: string, id: string, body: any) => apiRequest<Single<any>>(`/admin/medical-centers/${centerId}/questions/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    deleteQuestion: (centerId: string, id: string) => apiRequest(`/admin/medical-centers/${centerId}/questions/${id}`, { method: 'DELETE' }),
    copyQuestions: (centerId: string, targetCenterIds: string[], questionIds?: string[]) => apiRequest<Single<{ count: number }>>(`/admin/medical-centers/${centerId}/questions/copy-to`, { method: 'POST', body: JSON.stringify({ targetCenterIds, questionIds }) }),
  },

  // AI Providers
  aiProviders: {
    list: () => apiRequest<Single<any[]>>('/ai/providers'),
    save: (body: any) => apiRequest<Single<any>>('/ai/providers', { method: 'POST', body: JSON.stringify(body) }),
    delete: (id: string) => apiRequest(`/ai/providers/${id}`, { method: 'DELETE' }),
    test: (body: any) => apiRequest<Single<{text: string}>>('/ai/providers/test', { method: 'POST', body: JSON.stringify(body) }),
  },

  // AI Knowledge Base
  aiKnowledgeBase: {
    list: () => apiRequest<Single<any[]>>('/ai/knowledge-base'),
    save: (body: any) => apiRequest<Single<any>>('/ai/knowledge-base', { method: 'POST', body: JSON.stringify(body) }),
    delete: (id: string) => apiRequest(`/ai/knowledge-base/${id}`, { method: 'DELETE' }),
  },

  // Doctors
  doctors: {
    list: (params?: any) => apiRequest<Paginated<any>>(`/admin/doctors${qs(params)}`),
    get: (id: string) => apiRequest<Single<any>>(`/admin/doctors/${id}`),
    create: (body: any) => apiRequest<Single<any>>('/admin/doctors', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: any) => apiRequest<Single<any>>(`/admin/doctors/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    publish: (id: string) => apiRequest<Single<any>>(`/admin/doctors/${id}/publish`, { method: 'POST' }),
    unpublish: (id: string) => apiRequest<Single<any>>(`/admin/doctors/${id}/unpublish`, { method: 'POST' }),
    delete: (id: string) => apiRequest(`/admin/doctors/${id}`, { method: 'DELETE' }),
  },

  // Pages
  pages: {
    list: (params?: any) => apiRequest<Paginated<any>>(`/admin/pages${qs(params)}`),
    get: (id: string) => apiRequest<Single<any>>(`/admin/pages/${id}`),
    create: (body: any) => apiRequest<Single<any>>('/admin/pages', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: any) => apiRequest<Single<any>>(`/admin/pages/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    publish: (id: string) => apiRequest<Single<any>>(`/admin/pages/${id}/publish`, { method: 'POST' }),
    unpublish: (id: string) => apiRequest<Single<any>>(`/admin/pages/${id}/unpublish`, { method: 'POST' }),
    delete: (id: string) => apiRequest(`/admin/pages/${id}`, { method: 'DELETE' }),
    // Sections
    listSections: (pageId: string) => apiRequest<Single<any[]>>(`/admin/pages/${pageId}/sections`),
    createSection: (pageId: string, body: any) => apiRequest<Single<any>>(`/admin/pages/${pageId}/sections`, { method: 'POST', body: JSON.stringify(body) }),
    updateSection: (pageId: string, sectionId: string, body: any) => apiRequest<Single<any>>(`/admin/pages/${pageId}/sections/${sectionId}`, { method: 'PATCH', body: JSON.stringify(body) }),
    deleteSection: (pageId: string, sectionId: string) => apiRequest(`/admin/pages/${pageId}/sections/${sectionId}`, { method: 'DELETE' }),
    reorderSections: (pageId: string, order: string[]) => apiRequest<Single<any[]>>(`/admin/pages/${pageId}/sections/reorder`, { method: 'PATCH', body: JSON.stringify({ order }) }),
  },

  // News
  news: {
    // Categories
    listCategories: (params?: any) => apiRequest<Paginated<any>>(`/admin/news-categories${qs(params)}`),
    getCategory: (id: string) => apiRequest<Single<any>>(`/admin/news-categories/${id}`),
    createCategory: (body: any) => apiRequest<Single<any>>('/admin/news-categories', { method: 'POST', body: JSON.stringify(body) }),
    updateCategory: (id: string, body: any) => apiRequest<Single<any>>(`/admin/news-categories/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    deleteCategory: (id: string) => apiRequest(`/admin/news-categories/${id}`, { method: 'DELETE' }),
    // Posts
    listPosts: (params?: any) => apiRequest<Paginated<any>>(`/admin/news${qs(params)}`),
    getPost: (id: string) => apiRequest<Single<any>>(`/admin/news/${id}`),
    createPost: (body: any) => apiRequest<Single<any>>('/admin/news', { method: 'POST', body: JSON.stringify(body) }),
    updatePost: (id: string, body: any) => apiRequest<Single<any>>(`/admin/news/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    publishPost: (id: string) => apiRequest<Single<any>>(`/admin/news/${id}/publish`, { method: 'POST' }),
    unpublishPost: (id: string) => apiRequest<Single<any>>(`/admin/news/${id}/unpublish`, { method: 'POST' }),
    deletePost: (id: string) => apiRequest(`/admin/news/${id}`, { method: 'DELETE' }),
  },

  // Settings
  settings: {
    listPublic: (group?: string) => apiRequest<Single<any[]>>(`/settings${qs({ group })}`, { skipAuth: true }),
    list: (params?: any) => apiRequest<Single<any[]>>(`/admin/settings${qs(params)}`),
    update: (key: string, value: any) => apiRequest<Single<any>>(`/admin/settings/${key}`, { method: 'PATCH', body: JSON.stringify({ value }) }),
    listFlags: () => apiRequest<Single<any[]>>('/admin/settings/feature-flags'),
    toggleFlag: (key: string, isEnabled: boolean) => apiRequest<Single<any>>(`/admin/settings/feature-flags/${key}`, { method: 'PATCH', body: JSON.stringify({ isEnabled }) }),
  },

  // FAQs
  faqs: {
    list: (params?: any) => apiRequest<Paginated<any>>(`/admin/faqs${qs(params)}`),
    create: (body: any) => apiRequest<Single<any>>('/admin/faqs', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: any) => apiRequest<Single<any>>(`/admin/faqs/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id: string) => apiRequest(`/admin/faqs/${id}`, { method: 'DELETE' }),
  },

  // Navigation
  navigation: {
    list: (params?: any) => apiRequest<Single<any[]>>(`/admin/navigation${qs(params)}`),
    get: (id: string) => apiRequest<Single<any>>(`/admin/navigation/${id}`),
    create: (body: any) => apiRequest<Single<any>>('/admin/navigation', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: any) => apiRequest<Single<any>>(`/admin/navigation/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id: string) => apiRequest(`/admin/navigation/${id}`, { method: 'DELETE' }),
    reorder: (order: string[]) => apiRequest<Single<any[]>>('/admin/navigation/reorder', { method: 'PATCH', body: JSON.stringify({ order }) }),
  },

  // Testimonials
  testimonials: {
    list: (params?: any) => apiRequest<Paginated<any>>(`/admin/testimonials${qs(params)}`),
    get: (id: string) => apiRequest<Single<any>>(`/admin/testimonials/${id}`),
    create: (body: any) => apiRequest<Single<any>>('/admin/testimonials', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: any) => apiRequest<Single<any>>(`/admin/testimonials/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    publish: (id: string) => apiRequest<Single<any>>(`/admin/testimonials/${id}/publish`, { method: 'POST' }),
    unpublish: (id: string) => apiRequest<Single<any>>(`/admin/testimonials/${id}/unpublish`, { method: 'POST' }),
    delete: (id: string) => apiRequest(`/admin/testimonials/${id}`, { method: 'DELETE' }),
  },

  // Appointments
  appointments: {
    list: (params?: any) => apiRequest<Paginated<any>>(`/admin/appointments${qs(params)}`),
    get: (id: string) => apiRequest<Single<any>>(`/admin/appointments/${id}`),
    updateStatus: (id: string, status: string, notes?: string) =>
      apiRequest<Single<any>>(`/admin/appointments/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, notes }) }),
    delete: (id: string) => apiRequest(`/admin/appointments/${id}`, { method: 'DELETE' }),
  },

  // Contact
  contact: {
    list: (params?: any) => apiRequest<Paginated<any>>(`/admin/contact${qs(params)}`),
    get: (id: string) => apiRequest<Single<any>>(`/admin/contact/${id}`),
    markRead: (id: string) => apiRequest<Single<any>>(`/admin/contact/${id}/read`, { method: 'PATCH' }),
  },

  // Users
  users: {
    list: (params?: any) => apiRequest<Paginated<any>>(`/admin/users${qs(params)}`),
    get: (id: string) => apiRequest<Single<any>>(`/admin/users/${id}`),
    create: (body: any) => apiRequest<Single<any>>('/admin/users', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: any) => apiRequest<Single<any>>(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id: string) => apiRequest(`/admin/users/${id}`, { method: 'DELETE' }),
    listRoles: () => apiRequest<Single<any[]>>('/admin/roles'),
  },

  // Brands
  brands: {
    list: () => apiRequest<Single<any[]>>('/admin/brands'),
    get: (id: string) => apiRequest<Single<any>>(`/admin/brands/${id}`),
    create: (body: any) => apiRequest<Single<any>>('/admin/brands', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: any) => apiRequest<Single<any>>(`/admin/brands/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id: string) => apiRequest(`/admin/brands/${id}`, { method: 'DELETE' }),
    addSocial: (brandId: string, body: any) => apiRequest<Single<any>>(`/admin/brands/${brandId}/social-accounts`, { method: 'POST', body: JSON.stringify(body) }),
    updateSocial: (brandId: string, id: string, body: any) => apiRequest<Single<any>>(`/admin/brands/${brandId}/social-accounts/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    deleteSocial: (brandId: string, id: string) => apiRequest(`/admin/brands/${brandId}/social-accounts/${id}`, { method: 'DELETE' }),
  },

  // Investors
  investors: {
    get: () => apiRequest<Single<any>>('/admin/investors-page'),
    update: (body: any) => apiRequest<Single<any>>('/admin/investors-page', { method: 'POST', body: JSON.stringify(body) }),
  },

  // Audit
  audit: {
    list: (params?: any) => apiRequest<Paginated<any>>(`/admin/audit-logs${qs(params)}`),
    get: (id: string) => apiRequest<Single<any>>(`/admin/audit-logs/${id}`),
  },

  // Receptionist conversations
  conversations: {
    list: (params?: any) => apiRequest<any>(`/admin/receptionist/conversations${qs(params)}`),
    get: (id: string) => apiRequest<any>(`/admin/receptionist/conversations/${id}`),
    stats: () => apiRequest<any>('/admin/receptionist/conversations/stats'),
  },
};
