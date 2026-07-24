# 16 — Seed Data Specification (بيانات الزراعة الأولية)

> **Document Version:** 1.1
> **Status:** Final
> **Last Updated:** 2025-07-16
> **Source of Truth:** Yes

> **Purpose:** Complete initial production data required for first deployment. This document specifies every record that must exist in the database before the platform is functional.
>
> **Cross-references:**
> - `03_DATABASE_SCHEMA.md` — database models these records populate
> - `../security/05_USER_ROLES_AND_PERMISSIONS.md` — role definitions
> - `../architecture/01_ARCHITECTURE.md` §6 — Social Sync configuration
> - `../architecture/01_ARCHITECTURE.md` §7 — AI Chat configuration
> - `../architecture/10_FOLDER_STRUCTURE.md` — `apps/api/prisma/seed.ts` file

---

## Implementation Notes

- The seed script (`apps/api/prisma/seed.ts`) must create ALL records below on first run.
- Use `upsert` (not `create`) to make the seed idempotent (safe to run multiple times).
- The seed must print credentials to console on first run for the Super Admin account.
- Run via: `npm run db:seed` (defined in root `package.json`).

### Relationship Resolution (Important)

In the seed data below, **relationship fields use human-readable slugs** (e.g., `hospitalIds: ['future-hospital', 'delta-hospital']`) purely for readability. These are **not valid foreign keys** — the database uses `cuid()` IDs.

The seed script must **resolve slugs to database IDs** at runtime after upserting parent records:

```typescript
// Example: resolving slug to ID after upsert
const futureHospital = await prisma.hospital.upsert({
  where: { slug: 'future-hospital' },
  create: { slug: 'future-hospital', /* ... */ },
  update: {},
});

// futureHospital.id is now a real cuid(), e.g. "clx9abc123..."
// Use this ID for junction table inserts
await prisma.hospitalMedicalCenter.upsert({
  where: { hospitalId_medicalCenterId: {
    hospitalId: futureHospital.id,
    medicalCenterId: orthopedicCenter.id,
  }},
  create: { hospitalId: futureHospital.id, medicalCenterId: orthopedicCenter.id },
  update: {},
});
```

**Never hardcode IDs.** Always resolve them from the upsert return value.

### Seeder Execution Order (Critical)

The seed functions **must execute in the documented order** (Section 14) because later seeders depend on records created by earlier seeders. Specifically:

| Seeder | Depends On | Reason |
|---|---|---|
| Super Admin User | Roles | Needs `roleId` from seeded Role |
| Medical Centers | Hospitals | Junction table needs hospital IDs |
| Hospital-Center Links | Hospitals + Medical Centers | Needs IDs from both |
| Pages | (none) | Independent, but must run before Sections |
| News Posts | News Categories | Needs `categoryId` from seeded categories |
| Media Folders | Media Folders (parent) | Self-referential; parents must exist first |
| Navigation Items | (none) | Independent; but parentId requires self-ordering |

**Do not reorder or parallelize seed functions.** Each function must complete (and return its created IDs) before the next function runs.

---

## 1. Roles

> See `../security/05_USER_ROLES_AND_PERMISSIONS.md` §2 for the permissions JSON structure.

```typescript
const roles = [
  {
    name: 'SUPER_ADMIN',
    permissions: {
      pages:              ['view', 'create', 'edit', 'publish', 'delete'],
      hospitals:          ['view', 'create', 'edit', 'publish', 'delete'],
      'medical-centers':  ['view', 'create', 'edit', 'publish', 'delete'],
      doctors:            ['view', 'create', 'edit', 'publish', 'delete'],
      news:               ['view', 'create', 'edit', 'publish', 'delete'],
      media:              ['view', 'upload', 'delete'],
      appointments:       ['view', 'manage'],
      contact:            ['view', 'manage'],
      testimonials:       ['view', 'create', 'edit', 'delete'],
      navigation:         ['view', 'edit'],
      'ai-chat':          ['view', 'manage'],
      users:              ['view', 'manage'],
      settings:           ['view', 'manage'],
      audit:              ['view'],
      analytics:          ['view'],
    },
  },
  {
    name: 'ADMIN',
    permissions: {
      pages:              ['view', 'create', 'edit', 'publish', 'delete'],
      hospitals:          ['view', 'create', 'edit', 'publish', 'delete'],
      'medical-centers':  ['view', 'create', 'edit', 'publish', 'delete'],
      doctors:            ['view', 'create', 'edit', 'publish', 'delete'],
      news:               ['view', 'create', 'edit', 'publish', 'delete'],
      media:              ['view', 'upload', 'delete'],
      appointments:       ['view', 'manage'],
      contact:            ['view', 'manage'],
      testimonials:       ['view', 'create', 'edit', 'delete'],
      navigation:         ['view', 'edit'],
      'ai-chat':          ['view', 'manage'],
      users:              ['view', 'manage'],
      settings:           ['view', 'manage'],
      audit:              ['view'],
      analytics:          ['view'],
    },
  },
  {
    name: 'MANAGER',
    permissions: {
      pages:              ['view', 'create', 'edit', 'publish', 'delete'],
      hospitals:          ['view', 'create', 'edit', 'publish', 'delete'],
      'medical-centers':  ['view', 'create', 'edit', 'publish', 'delete'],
      doctors:            ['view', 'create', 'edit', 'publish', 'delete'],
      news:               ['view', 'create', 'edit', 'publish', 'delete'],
      media:              ['view', 'upload', 'delete'],
      appointments:       ['view', 'manage'],
      contact:            ['view', 'manage'],
      testimonials:       ['view'],
      navigation:         ['view'],
      'ai-chat':          ['view'],
      users:              [],
      settings:           ['view'],
      audit:              ['view'],
      analytics:          ['view'],
    },
  },
  {
    name: 'EDITOR',
    permissions: {
      pages:              ['view', 'create', 'edit'],
      hospitals:          ['view', 'create', 'edit'],
      'medical-centers':  ['view', 'create', 'edit'],
      doctors:            ['view', 'create', 'edit'],
      news:               ['view', 'create', 'edit'],
      media:              ['view', 'upload'],
      appointments:       ['view'],
      contact:            ['view'],
      testimonials:       ['view'],
      navigation:         ['view'],
      'ai-chat':          ['view'],
      users:              [],
      settings:           [],
      audit:              [],
      analytics:          ['view'],
    },
  },
  {
    name: 'VIEWER',
    permissions: {
      pages:              ['view'],
      hospitals:          ['view'],
      'medical-centers':  ['view'],
      doctors:            ['view'],
      news:               ['view'],
      media:              ['view'],
      appointments:       ['view'],
      contact:            ['view'],
      testimonials:       ['view'],
      navigation:         ['view'],
      'ai-chat':          ['view'],
      users:              [],
      settings:           [],
      audit:              [],
      analytics:          ['view'],
    },
  },
];
```

---

## 2. Super Admin User

> **Login:** `admin@insan-platform.com`
> **Temporary Password:** `INSAN@Admin2026!` (must be changed on first login)

```typescript
const superAdminUser = {
  name: 'Super Admin',
  email: 'admin@insan-platform.com',
  passwordHash: await argon2.hash('INSAN@Admin2026!'),
  roleId: /* SUPER_ADMIN role id */,
  isActive: true,
};
```

> **Console output on seed:**
> ```
> =============================================
> SUPER ADMIN ACCOUNT CREATED
> Email: admin@insan-platform.com
> Password: INSAN@Admin2026!
> IMPORTANT: Change this password immediately after first login.
> =============================================
> ```

---

## 3. Hospitals

> See `../ui/08_DESIGN_SYSTEM.md` §1 for brand colors.

```typescript
const hospitals = [
  {
    slug: 'future-hospital',
    name: { ar: 'مستشفى المستقبل التخصصي', en: 'Future Specialized Hospital' },
    shortDescription: {
      ar: 'مستشفى المستقبل التخصصي — رمز القيادة والابتكار في الرعاية الصحية',
      en: 'Future Specialized Hospital — A symbol of leadership and innovation in healthcare',
    },
    description: {
      ar: 'مستشفى المستقبل التخصصي هو أحد أبرز المستشفيات ضمن منظومة إنسان للرعاية الصحية. يتميز المستشفى بتقديم خدمات طبية متقدمة بتقنيات حديثة، مع فريق طبي دولي يحمل رؤية واضحة لتقديم أفضل تجربة رعاية للمرضى.',
      en: 'Future Specialized Hospital is one of the leading hospitals within the INSAN Healthcare Ecosystem. The hospital delivers advanced medical services with modern technologies, led by an international medical team with a clear vision of providing the best patient care experience.',
    },
    logoUrl: '/logos/future-logo.png',
    heroImage: '/images/future-hero.jpg',
    brandColor: '#1B4FCC',
    status: 'PUBLISHED',
    metaTitle: {
      ar: 'مستشفى المستقبل التخصصي | منظومة إنسان',
      en: 'Future Specialized Hospital | INSAN Platform',
    },
    metaDescription: {
      ar: 'مستشفى المستقبل التخصصي — خدمات طبية متقدمة تحت مظلة منظومة إنسان للرعاية الصحية المتكاملة',
      en: 'Future Specialized Hospital — Advanced medical services under the INSAN Healthcare Ecosystem',
    },
  },
  {
    slug: 'delta-hospital',
    name: { ar: 'مستشفى الدلتا الدولي', en: 'Delta International Hospital' },
    shortDescription: {
      ar: 'مستشفى الدلتا الدولي — إعادة بناء الثقة من خلال التجربة الإنسانية',
      en: 'Delta International Hospital — Restoring trust through human experience',
    },
    description: {
      ar: 'مستشفى الدلتا الدولي يمثل رحلة التحول والتطوير في منظومة إنسان. المستشفى يقدم تجربة رعاية صحية إنسانية تضع المريض في قلب كل قرار، مع التزام كامل بمعايير الجودة العالمية.',
      en: 'Delta International Hospital represents the journey of transformation and development within the INSAN ecosystem. The hospital delivers a human-centered healthcare experience that places the patient at the heart of every decision, with a full commitment to international quality standards.',
    },
    logoUrl: '/logos/delta-logo.png',
    heroImage: '/images/delta-hero.jpg',
    brandColor: '#0E7C86',
    status: 'PUBLISHED',
    metaTitle: {
      ar: 'مستشفى الدلتا الدولي | منظومة إنسان',
      en: 'Delta International Hospital | INSAN Platform',
    },
    metaDescription: {
      ar: 'مستشفى الدلتا الدولي — تجربة رعاية صحية إنسانية تحت مظلة منظومة إنسان',
      en: 'Delta International Hospital — A human healthcare experience under the INSAN Ecosystem',
    },
  },
];
```

---

## 4. Medical Centers

> 12 unique medical centers. Some are shared between Future and Delta hospitals (see hospitalIds in junction tables below). The HospitalMedicalCenter junction table defines which hospital operates which center. The `hospitalIds` array in the junction table defines which hospital operates which center.

```typescript
const medicalCenters = [
  {
    slug: 'orthopedic-center',
    name: { ar: 'مركز العناية العظمية والمفاصل', en: 'Orthopedic & Joint Care Center' },
    description: { ar: '...', en: '...' },
    features: [
      { icon: 'bone', title: { ar: 'جراحة المفاصل', en: 'Joint Surgery' } },
      { icon: 'activity', title: { ar: 'العلاج الطبيعي', en: 'Physical Therapy' } },
    ],
    services: [
      { title: { ar: 'استبدال المفصل', en: 'Joint Replacement' }, description: { ar: '...', en: '...' } },
    ],
    isFeatured: true,
    status: 'PUBLISHED',
    hospitalIds: ['future-hospital', 'delta-hospital'],
  },
  {
    slug: 'cardiac-center',
    name: { ar: 'مركز القلب والأوعية الدموية', en: 'Cardiac & Vascular Center' },
    description: { ar: '...', en: '...' },
    features: [],
    services: [],
    isFeatured: true,
    status: 'PUBLISHED',
    hospitalIds: ['future-hospital', 'delta-hospital'],
  },
  {
    slug: 'womens-health-center',
    name: { ar: 'مركز صحة المرأة', en: "Women's Health Center" },
    description: { ar: '...', en: '...' },
    features: [],
    services: [],
    isFeatured: true,
    status: 'PUBLISHED',
    hospitalIds: ['delta-hospital'],
  },
  {
    slug: 'digestive-center',
    name: { ar: 'مركز الجهاز الهضمي والكبد', en: 'Digestive & Liver Center' },
    description: { ar: '...', en: '...' },
    features: [],
    services: [],
    isFeatured: true,
    status: 'PUBLISHED',
    hospitalIds: ['delta-hospital'],
  },
  {
    slug: 'neurology-center',
    name: { ar: 'مركز الأعصاب والدماغ', en: 'Neurology & Brain Center' },
    description: { ar: '...', en: '...' },
    features: [],
    services: [],
    isFeatured: true,
    status: 'PUBLISHED',
    hospitalIds: ['future-hospital', 'delta-hospital'],
  },
  {
    slug: 'emergency-center',
    name: { ar: 'مركز الطوارئ', en: 'Emergency Center' },
    description: { ar: '...', en: '...' },
    features: [],
    services: [],
    isFeatured: false,
    status: 'PUBLISHED',
    hospitalIds: ['delta-hospital'],
  },
  {
    slug: 'icu-center',
    name: { ar: 'مركز العناية المركزة', en: 'Intensive Care Center' },
    description: { ar: '...', en: '...' },
    features: [],
    services: [],
    isFeatured: false,
    status: 'PUBLISHED',
    hospitalIds: ['delta-hospital'],
  },
  {
    slug: 'senior-care-center',
    name: { ar: 'مركز كبارنا للرعاية', en: 'Senior Care Center' },
    description: { ar: '...', en: '...' },
    features: [],
    services: [],
    isFeatured: false,
    status: 'PUBLISHED',
    hospitalIds: ['delta-hospital'],
  },
  {
    slug: 'ophthalmology-center',
    name: { ar: 'مركز العيون', en: 'Ophthalmology Center' },
    description: { ar: '...', en: '...' },
    features: [],
    services: [],
    isFeatured: false,
    status: 'PUBLISHED',
    hospitalIds: ['future-hospital'],
  },
  {
    slug: 'dermatology-center',
    name: { ar: 'مركز الجلدية والتجميل', en: 'Dermatology & Aesthetics Center' },
    description: { ar: '...', en: '...' },
    features: [],
    services: [],
    isFeatured: false,
    status: 'PUBLISHED',
    hospitalIds: ['future-hospital'],
  },
  {
    slug: 'pediatrics-center',
    name: { ar: 'مركز طب الأطفال', en: 'Pediatrics Center' },
    description: { ar: '...', en: '...' },
    features: [],
    services: [],
    isFeatured: false,
    status: 'PUBLISHED',
    hospitalIds: ['delta-hospital'],
  },
  {
    slug: 'dental-center',
    name: { ar: 'مركز طب الأسنان', en: 'Dental Center' },
    description: { ar: '...', en: '...' },
    features: [],
    services: [],
    isFeatured: false,
    status: 'PUBLISHED',
    hospitalIds: ['delta-hospital'],
  },
];
```

---

## 5. Navigation Items

### Header Navigation

```typescript
const headerNav = [
  { label: { ar: 'الرئيسية', en: 'Home' }, target: '/', location: 'header', order: 1, isVisible: true },
  { label: { ar: 'عن المجموعة', en: 'About' }, target: '/about', location: 'header', order: 2, isVisible: true },
  { label: { ar: 'مستشفياتنا', en: 'Our Hospitals' }, target: '/hospitals', location: 'header', order: 3, isVisible: true },
  { label: { ar: 'مراكزنا الطبية', en: 'Our Medical Centers' }, target: '/medical-centers', location: 'header', order: 4, isVisible: true },
  { label: { ar: 'الأخبار والأنشطة', en: 'News & Media' }, target: '/news', location: 'header', order: 5, isVisible: true },
  { label: { ar: 'تواصل معنا', en: 'Contact Us' }, target: '/contact', location: 'header', order: 6, isVisible: true },
  // NOTE: /investors is NOT in any navigation — direct URL only
];
```

### Footer Navigation

```typescript
const footerNav = [
  { label: { ar: 'الرئيسية', en: 'Home' }, target: '/', location: 'footer', order: 1, isVisible: true },
  { label: { ar: 'عن المجموعة', en: 'About' }, target: '/about', location: 'footer', order: 2, isVisible: true },
  { label: { ar: 'مستشفياتنا', en: 'Our Hospitals' }, target: '/hospitals', location: 'footer', order: 3, isVisible: true },
  { label: { ar: 'مراكزنا الطبية', en: 'Our Medical Centers' }, target: '/medical-centers', location: 'footer', order: 4, isVisible: true },
  { label: { ar: 'الأخبار', en: 'News' }, target: '/news', location: 'footer', order: 5, isVisible: true },
  { label: { ar: 'تواصل معنا', en: 'Contact Us' }, target: '/contact', location: 'footer', order: 6, isVisible: true },
  { label: { ar: 'سياسة الخصوصية', en: 'Privacy Policy' }, target: '/privacy', location: 'footer', order: 7, isVisible: true },
  { label: { ar: 'شروط الاستخدام', en: 'Terms of Use' }, target: '/terms', location: 'footer', order: 8, isVisible: true },
];
```

---

## 6. Pages

```typescript
const pages = [
  {
    slug: 'home',
    type: 'standard',
    title: { ar: 'الرئيسية', en: 'Home' },
    status: 'PUBLISHED',
    metaTitle: { ar: 'منظومة إنسان للرعاية الصحية', en: 'INSAN Healthcare Platform' },
    metaDescription: {
      ar: 'منظومة إنسان — منصة مصرية متكاملة لإدارة المستشفيات والمراكز الطبية المتخصصة',
      en: 'INSAN — An integrated Egyptian platform for managing hospitals and specialized medical centers',
    },
    robotsIndex: true,
    sections: [
      { componentType: 'Hero', order: 1, config: { title: { ar: 'منظومة إنسان للرعاية الصحية', en: 'INSAN Healthcare Platform' }, subtitle: { ar: 'نبني مؤسسات صحية قوية ومستدامة', en: 'Building strong and sustainable healthcare institutions' }, ctas: [{ label: { ar: 'اكتشف منظومتنا', en: 'Explore Our Ecosystem' }, href: '/hospitals' }, { label: { ar: 'تواصل معنا', en: 'Contact Us' }, href: '/contact' }] } },
    ],
  },
  {
    slug: 'about',
    type: 'standard',
    title: { ar: 'عن المجموعة', en: 'About INSAN' },
    status: 'PUBLISHED',
    robotsIndex: true,
  },
  {
    slug: 'hospitals',
    type: 'standard',
    title: { ar: 'مستشفياتنا', en: 'Our Hospitals' },
    status: 'PUBLISHED',
    robotsIndex: true,
  },
  {
    slug: 'medical-centers',
    type: 'standard',
    title: { ar: 'مراكزنا الطبية', en: 'Our Medical Centers' },
    status: 'PUBLISHED',
    robotsIndex: true,
  },
  {
    slug: 'news',
    type: 'standard',
    title: { ar: 'الأخبار والأنشطة', en: 'News & Media' },
    status: 'PUBLISHED',
    robotsIndex: true,
  },
  {
    slug: 'contact',
    type: 'standard',
    title: { ar: 'تواصل معنا', en: 'Contact Us' },
    status: 'PUBLISHED',
    robotsIndex: true,
  },
  {
    slug: 'investors',
    type: 'hidden',
    title: { ar: 'المستثمرون', en: 'Investors' },
    status: 'PUBLISHED',
    robotsIndex: false,
    // CRITICAL: This page is hidden from ALL navigation and sitemap
    // See 02_INFORMATION_ARCHITECTURE_AND_PAGES.md §13
  },
  {
    slug: 'privacy',
    type: 'legal',
    title: { ar: 'سياسة الخصوصية', en: 'Privacy Policy' },
    status: 'PUBLISHED',
    robotsIndex: true,
  },
  {
    slug: 'terms',
    type: 'legal',
    title: { ar: 'شروط الاستخدام', en: 'Terms of Use' },
    status: 'PUBLISHED',
    robotsIndex: true,
  },
];
```

---

## 7. Settings

```typescript
const settings = [
  // General
  { key: 'site_name', group: 'general', value: { ar: 'منظومة إنسان', en: 'INSAN Platform' } },
  { key: 'site_tagline', group: 'general', value: { ar: 'الرعاية الصحية المتكاملة', en: 'Integrated Healthcare' } },
  { key: 'contact_email', group: 'general', value: 'info@insan-platform.com' },
  { key: 'contact_phone', group: 'general', value: '+20-XXX-XXX-XXXX' },
  { key: 'contact_address', group: 'general', value: { ar: 'القاهرة، مصر', en: 'Cairo, Egypt' } },
  { key: 'whatsapp_number', group: 'general', value: '+20-XXX-XXX-XXXX' },
  { key: 'emergency_phone', group: 'general', value: '+20-XXX-XXX-XXXX' },
  { key: 'timezone', group: 'general', value: 'Africa/Cairo' },
  { key: 'error_page_text', group: 'general', value: { ar: 'عذراً، الصفحة غير موجودة', en: 'Sorry, page not found' } },

  // Brand
  { key: 'primary_color', group: 'brand', value: '#0B1F3A' },
  { key: 'secondary_color', group: 'brand', value: '#0E7C86' },
  { key: 'accent_color', group: 'brand', value: '#0B5FFF' },
  { key: 'logo_light', group: 'brand', value: '/logos/insan-logo-light.png' },
  { key: 'logo_dark', group: 'brand', value: '/logos/insan-logo-dark.png' },
  { key: 'favicon', group: 'brand', value: '/favicon.ico' },

  // SEO
  { key: 'default_meta_title', group: 'seo', value: { ar: 'منظومة إنسان للرعاية الصحية', en: 'INSAN Healthcare Platform' } },
  { key: 'default_meta_description', group: 'seo', value: { ar: '...', en: '...' } },
  { key: 'ga4_measurement_id', group: 'seo', value: '' }, // Empty until owner provides
  { key: 'gtm_container_id', group: 'seo', value: '' }, // Empty until owner provides
  { key: 'sitemap_enabled', group: 'seo', value: true },
  { key: 'robots_txt', group: 'seo', value: 'User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /investors' },

  // Languages
  { key: 'default_locale', group: 'languages', value: 'ar' },
  { key: 'enabled_locales', group: 'languages', value: ['ar', 'en'] },

  // Security
  { key: 'password_min_length', group: 'security', value: 8 },
  { key: 'password_require_uppercase', group: 'security', value: true },
  { key: 'password_require_number', group: 'security', value: true },
  { key: 'session_duration_hours', group: 'security', value: 24 }, // Controls admin UI idle timeout display only. Actual JWT expiry: access=15min, refresh=7d (see 10_FOLDER_STRUCTURE.md)
  { key: 'recaptcha_enabled', group: 'security', value: false },
  { key: 'recaptcha_site_key', group: 'security', value: '' },
];
```

---

## 8. Integration Settings (Encrypted)

> These are placeholder values. The owner must replace them from the admin panel.
> Values are stored encrypted via `ENCRYPTION_KEY` env var.

```typescript
const integrationSettings = [
  { provider: 'facebook_page_insan', encryptedValue: '', isActive: false },
  { provider: 'facebook_page_future', encryptedValue: '', isActive: false },
  { provider: 'facebook_page_delta', encryptedValue: '', isActive: false },
  { provider: 'instagram_page_insan', encryptedValue: '', isActive: false },
  { provider: 'linkedin_page_insan', encryptedValue: '', isActive: false },
];
```

---

## 9. AI Chat Settings

```typescript
const aiSettings = [
  { key: 'isEnabled', value: true },
  { key: 'greetingMessage', value: { ar: 'مرحباً! أنا مساعد إنسان الذكي. كيف يمكنني مساعدتك اليوم؟', en: 'Hello! I am the INSAN AI assistant. How can I help you today?' } },
  { key: 'escalationEnabled', value: true },
  { key: 'escalationChannel', value: 'whatsapp' },
  { key: 'escalationMessage', value: { ar: 'يبدو أن سؤالك يحتاج تخصيصاً أكثر. يمكنك التواصل معنا مباشرة.', en: 'It seems your question needs more specific attention. You can contact us directly.' } },
];
```

---

## 10. AI Knowledge Base (Sample Entries)

```typescript
const knowledgeBase = [
  {
    topic: { ar: 'عن المستشفيات', en: 'About Hospitals' },
    question: { ar: 'كم عدد المستشفيات في منظومة إنسان؟', en: 'How many hospitals are in the INSAN ecosystem?' },
    answer: { ar: 'تضم منظومة إنسان مستشفيين: مستقبل التخصصي والدلتا الدولي، بالإضافة إلى 12 مركزاً طبياً متخصصاً.', en: 'The INSAN ecosystem includes two hospitals: Future Specialized and Delta International, along with 12 specialized medical centers.' },
    category: 'general',
    isActive: true,
  },
  {
    topic: { ar: 'المواعيد', en: 'Appointments' },
    question: { ar: 'كيف أحجز موعد؟', en: 'How do I book an appointment?' },
    answer: { ar: 'يمكنك حجز موعد من خلال نموذج "احجز موعد" المتاح في جميع صفحات الموقع، أو التواصل معنا عبر واتساب.', en: 'You can book an appointment through the "Book Appointment" form available on all pages, or contact us via WhatsApp.' },
    category: 'appointments',
    isActive: true,
  },
  {
    topic: { ar: 'العنوان', en: 'Location' },
    question: { ar: 'أين يقع المستشفى؟', en: 'Where is the hospital located?' },
    answer: { ar: 'يقع مستشفى المستقبل التخصصي في القاهرة، مصر. للعناوين التفصيلية، يرجى زيارة صفحة "تواصل معنا".', en: 'Future Specialized Hospital is located in Cairo, Egypt. For detailed addresses, please visit the "Contact Us" page.' },
    category: 'location',
    isActive: true,
  },
  {
    topic: { ar: 'ساعات العمل', en: 'Working Hours' },
    question: { ar: 'ما هي ساعات العمل؟', en: 'What are the working hours?' },
    answer: { ar: 'ساعات العمل من السبت إلى الخميس، من الساعة 9 صباحاً حتى 5 مساءً. قسم الطوارئ متاح على مدار الساعة.', en: 'Working hours are Saturday to Thursday, 9:00 AM to 5:00 PM. The emergency department is available 24/7.' },
    category: 'general',
    isActive: true,
  },
];
```

---

## 11. News Categories

```typescript
const newsCategories = [
  { name: { ar: 'أخبار المنظومة', en: 'Ecosystem News' }, slug: 'ecosystem-news' },
  { name: { ar: 'أخبار المستشفيات', en: 'Hospital News' }, slug: 'hospital-news' },
  { name: { ar: 'أخبار المراكز الطبية', en: 'Medical Center News' }, slug: 'medical-center-news' },
  { name: { ar: 'الأحداث والأنشطة', en: 'Events & Activities' }, slug: 'events' },
  { name: { ar: 'نصائح طبية', en: 'Health Tips' }, slug: 'health-tips' },
];
```

---

## 12. Media Folders

```typescript
const mediaFolders = [
  { name: 'Hospitals', parentId: null },
  { name: 'Future Hospital', parentId: /* Hospitals id */ },
  { name: 'Delta Hospital', parentId: /* Hospitals id */ },
  { name: 'Medical Centers', parentId: null },
  { name: 'Doctors', parentId: null },
  { name: 'News', parentId: null },
  { name: 'General', parentId: null },
  { name: 'Logos & Brand', parentId: null },
];
```

---

## 13. Testimonials (Sample)

```typescript
const testimonials = [
  {
    name: { ar: 'د. أحمد محمد', en: 'Dr. Ahmed Mohamed' },
    audience: 'DOCTOR',
    quote: { ar: 'العمل في منظومة إنسان يمنحني الثقة بأنني أقدم أفضل رعاية ممكنة لمرضىي.', en: 'Working within the INSAN ecosystem gives me confidence that I am providing the best possible care for my patients.' },
    status: 'PUBLISHED',
    order: 1,
  },
  {
    name: { ar: 'مستثمر', en: 'An Investor' },
    audience: 'INVESTOR',
    quote: { ar: 'منظومة إنسان تمثل فرصة استثمارية حقيقية في قطاع الرعاية الصحية المصري.', en: 'The INSAN ecosystem represents a genuine investment opportunity in the Egyptian healthcare sector.' },
    status: 'PUBLISHED',
    order: 2,
  },
];
```

---

## 14. Seed Script Execution Order

> **WARNING:** This order is **not arbitrary** — later seeders depend on records created by earlier seeders. Do not reorder, skip, or parallelize seed functions. Each function must `await` completion and return its created IDs before the next function starts. See the dependency table in "Implementation Notes" above.

```typescript
// apps/api/prisma/seed.ts — Execution order
async function main() {
  console.log('🌱 Seeding database...');

  // 1. Roles
  const roles = await seedRoles();

  // 2. Super Admin User
  await seedSuperAdmin(roles);

  // 3. Settings (must come before integrations)
  await seedSettings();

  // 4. Integration Settings (encrypted)
  await seedIntegrationSettings();

  // 5. AI Settings
  await seedAiSettings();

  // 6. Hospitals
  const hospitals = await seedHospitals();

  // 7. Medical Centers + Junction Tables
  const centers = await seedMedicalCenters(hospitals);

  // 8. Navigation (header + footer)
  await seedNavigation();

  // 9. Pages (with at least Home page sections)
  await seedPages();

  // 10. News Categories
  await seedNewsCategories();

  // 11. AI Knowledge Base (sample entries)
  await seedKnowledgeBase();

  // 12. Media Folders
  await seedMediaFolders();

  // 13. Testimonials (sample)
  await seedTestimonials();

  console.log('✅ Seed complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```
