import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';
import seedData from './seed-data.json';

const prisma = new PrismaClient();

// ========================= ROLES =========================

async function seedRoles() {
  console.log('  → Seeding roles...');

  const roleDefs = [
    {
      name: 'SUPER_ADMIN' as const,
      permissions: {
        pages: ['view', 'create', 'edit', 'publish', 'delete', 'manage-hidden'],
        hospitals: ['view', 'create', 'edit', 'publish', 'delete'],
        'medical-centers': ['view', 'create', 'edit', 'publish', 'delete'],
        doctors: ['view', 'create', 'edit', 'publish', 'delete'],
        news: ['view', 'create', 'edit', 'publish', 'delete'],
        media: ['view', 'upload', 'delete'],
        appointments: ['view', 'manage'],
        contact: ['view', 'manage'],
        testimonials: ['view', 'create', 'edit', 'delete'],
        navigation: ['view', 'edit'],
        'ai-chat': ['view', 'manage'],
        users: ['view', 'manage'],
        settings: ['view', 'manage'],
        audit: ['view'],
        analytics: ['view'],
      },
    },
    {
      name: 'ADMIN' as const,
      permissions: {
        pages: ['view', 'create', 'edit', 'publish', 'delete', 'manage-hidden'],
        hospitals: ['view', 'create', 'edit', 'publish', 'delete'],
        'medical-centers': ['view', 'create', 'edit', 'publish', 'delete'],
        doctors: ['view', 'create', 'edit', 'publish', 'delete'],
        news: ['view', 'create', 'edit', 'publish', 'delete'],
        media: ['view', 'upload', 'delete'],
        appointments: ['view', 'manage'],
        contact: ['view', 'manage'],
        testimonials: ['view', 'create', 'edit', 'delete'],
        navigation: ['view', 'edit'],
        'ai-chat': ['view', 'manage'],
        users: ['view', 'manage'],
        settings: ['view', 'manage'],
        audit: ['view'],
        analytics: ['view'],
      },
    },
    {
      name: 'MANAGER' as const,
      permissions: {
        pages: ['view', 'create', 'edit', 'publish', 'delete'],
        hospitals: ['view', 'create', 'edit', 'publish', 'delete'],
        'medical-centers': ['view', 'create', 'edit', 'publish', 'delete'],
        doctors: ['view', 'create', 'edit', 'publish', 'delete'],
        news: ['view', 'create', 'edit', 'publish', 'delete'],
        media: ['view', 'upload', 'delete'],
        appointments: ['view', 'manage'],
        contact: ['view', 'manage'],
        testimonials: ['view'],
        navigation: ['view'],
        'ai-chat': ['view'],
        users: [],
        settings: ['view'],
        audit: ['view'],
        analytics: ['view'],
      },
    },
    {
      name: 'EDITOR' as const,
      permissions: {
        pages: ['view', 'create', 'edit'],
        hospitals: ['view', 'create', 'edit'],
        'medical-centers': ['view', 'create', 'edit'],
        doctors: ['view', 'create', 'edit'],
        news: ['view', 'create', 'edit'],
        media: ['view', 'upload'],
        appointments: ['view'],
        contact: ['view'],
        testimonials: ['view'],
        navigation: ['view'],
        'ai-chat': ['view'],
        users: [],
        settings: [],
        audit: [],
        analytics: ['view'],
      },
    },
    {
      name: 'VIEWER' as const,
      permissions: {
        pages: ['view'],
        hospitals: ['view'],
        'medical-centers': ['view'],
        doctors: ['view'],
        news: ['view'],
        media: ['view'],
        appointments: ['view'],
        contact: ['view'],
        testimonials: ['view'],
        navigation: ['view'],
        'ai-chat': ['view'],
        users: [],
        settings: [],
        audit: [],
        analytics: ['view'],
      },
    },
  ];

  const roles: Record<string, any> = {};
  for (const role of roleDefs) {
    const r = await prisma.role.upsert({
      where: { name: role.name },
      create: role,
      update: { permissions: role.permissions },
    });
    roles[role.name] = r;
  }

  console.log('    ✓ 5 roles seeded');
  return roles;
}

// ========================= SUPER ADMIN =========================

async function seedSuperAdmin(roles: Record<string, any>) {
  console.log('  → Seeding super admin user...');

  const TEMP_PASSWORD = 'INSAN@Admin2026!';
  const passwordHash = await bcrypt.hash(TEMP_PASSWORD, 12);

  const existing = await prisma.user.findUnique({
    where: { email: 'admin@insan-platform.com' },
  });

  if (!existing) {
    await prisma.user.create({
      data: {
        name: 'Super Admin',
        email: 'admin@insan-platform.com',
        passwordHash,
        roleId: roles['SUPER_ADMIN'].id,
        isActive: true,
      },
    });

    console.log('');
    console.log('=============================================');
    console.log('SUPER ADMIN ACCOUNT CREATED');
    console.log('Email: admin@insan-platform.com');
    console.log(`Password: ${TEMP_PASSWORD}`);
    console.log('IMPORTANT: Change this password immediately after first login.');
    console.log('=============================================');
    console.log('');
  } else {
    console.log('    ✓ Super admin already exists, skipping');
  }
}

// ========================= SETTINGS =========================

async function seedSettings() {
  console.log('  → Seeding settings...');

  const settings = [
    // General
    { key: 'site_name', group: 'general', value: { ar: 'منظومة إنسان', en: 'INSAN Platform' } },
    { key: 'site_tagline', group: 'general', value: { ar: 'الرعاية الصحية المتكاملة', en: 'Integrated Healthcare' } },
    { key: 'timezone', group: 'general', value: 'Africa/Cairo' },
    { key: 'error_page_text', group: 'general', value: { ar: 'عذراً، الصفحة غير موجودة', en: 'Sorry, page not found' } },
    {
      key: 'working_hours',
      group: 'general',
      value: {
        ar: 'السبت - الخميس: 9 صباحاً - 5 مساءً | الطوارئ: 24 ساعة',
        en: 'Saturday - Thursday: 9:00 AM - 5:00 PM | Emergency: 24/7',
        schedule: [
          { day: { ar: 'السبت', en: 'Saturday' }, open: '09:00', close: '17:00' },
          { day: { ar: 'الأحد', en: 'Sunday' }, open: '09:00', close: '17:00' },
          { day: { ar: 'الاثنين', en: 'Monday' }, open: '09:00', close: '17:00' },
          { day: { ar: 'الثلاثاء', en: 'Tuesday' }, open: '09:00', close: '17:00' },
          { day: { ar: 'الأربعاء', en: 'Wednesday' }, open: '09:00', close: '17:00' },
          { day: { ar: 'الخميس', en: 'Thursday' }, open: '09:00', close: '17:00' },
          { day: { ar: 'الجمعة', en: 'Friday' }, open: null, close: null, closed: true },
        ],
      },
    },
    // Contact
    { key: 'contact_email', group: 'contact', value: 'info@insan-platform.com' },
    { key: 'contact_phone', group: 'contact', value: '+20-XXX-XXX-XXXX' },
    { key: 'contact_address', group: 'contact', value: { ar: 'القاهرة، مصر', en: 'Cairo, Egypt' } },
    { key: 'whatsapp_number', group: 'contact', value: '+20-XXX-XXX-XXXX' },
    { key: 'emergency_phone', group: 'contact', value: '+20-XXX-XXX-XXXX' },
    
    // Social
    { key: 'social_facebook', group: 'social', value: 'https://facebook.com/insan' },
    { key: 'social_twitter', group: 'social', value: 'https://twitter.com/insan' },
    { key: 'social_instagram', group: 'social', value: 'https://instagram.com/insan' },
    { key: 'social_linkedin', group: 'social', value: 'https://linkedin.com/company/insan' },
    { key: 'social_youtube', group: 'social', value: 'https://youtube.com/c/insan' },
    { key: 'facebook_sync_review_period_hours', group: 'social', value: 24 },

    // Appearance
    { key: 'primary_color', group: 'appearance', value: '#0B1F3A' },
    { key: 'secondary_color', group: 'appearance', value: '#0E7C86' },
    { key: 'accent_color', group: 'appearance', value: '#0B5FFF' },
    { key: 'logo_light', group: 'appearance', value: '/logos/insan-logo-light.png' },
    { key: 'logo_dark', group: 'appearance', value: '/logos/insan-logo-dark.png' },
    { key: 'favicon', group: 'appearance', value: '/favicon.ico' },
    
    // SEO
    { key: 'default_meta_title', group: 'seo', value: { ar: 'منظومة إنسان للرعاية الصحية', en: 'INSAN Healthcare Platform' } },
    { key: 'default_meta_description', group: 'seo', value: { ar: 'منظومة إنسان — منصة مصرية متكاملة لإدارة المستشفيات والمراكز الطبية المتخصصة', en: 'INSAN — An integrated Egyptian platform for managing hospitals and specialized medical centers' } },
    { key: 'ga4_measurement_id', group: 'seo', value: '' },
    { key: 'gtm_container_id', group: 'seo', value: '' },
    { key: 'sitemap_enabled', group: 'seo', value: true },
    { key: 'robots_txt', group: 'seo', value: 'User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /investors' },
    // Languages
    { key: 'default_locale', group: 'languages', value: 'ar' },
    { key: 'enabled_locales', group: 'languages', value: ['ar', 'en'] },
    // Security
    { key: 'password_min_length', group: 'security', value: 8 },
    { key: 'password_require_uppercase', group: 'security', value: true },
    { key: 'password_require_number', group: 'security', value: true },
    { key: 'session_duration_hours', group: 'security', value: 24 },
    { key: 'recaptcha_enabled', group: 'security', value: false },
    { key: 'recaptcha_site_key', group: 'security', value: '' },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      create: setting,
      update: { value: setting.value },
    });
  }

  console.log(`    ✓ ${settings.length} settings seeded`);
}

// ========================= INTEGRATION SETTINGS =========================

async function seedIntegrationSettings() {
  console.log('  → Seeding integration settings...');

  const integrations = [
    { provider: 'facebook_page_insan', encryptedValue: '', isActive: false },
    { provider: 'facebook_page_future', encryptedValue: '', isActive: false },
    { provider: 'facebook_page_delta', encryptedValue: '', isActive: false },
    { provider: 'instagram_page_insan', encryptedValue: '', isActive: false },
    { provider: 'linkedin_page_insan', encryptedValue: '', isActive: false },
  ];

  for (const integration of integrations) {
    await prisma.integrationSetting.upsert({
      where: { provider: integration.provider },
      create: integration,
      update: {},
    });
  }

  console.log('    ✓ Integration settings seeded');
}

// ========================= AI SETTINGS =========================

async function seedAiSettings() {
  console.log('  → Seeding AI settings...');

  const aiSettings = [
    { key: 'isEnabled', value: true },
    { key: 'greetingMessage', value: { ar: 'مرحباً! أنا مساعد إنسان الذكي. كيف يمكنني مساعدتك اليوم؟', en: 'Hello! I am the INSAN AI assistant. How can I help you today?' } },
    { key: 'escalationEnabled', value: true },
    { key: 'escalationChannel', value: 'whatsapp' },
    { key: 'escalationMessage', value: { ar: 'يبدو أن سؤالك يحتاج تخصيصاً أكثر. يمكنك التواصل معنا مباشرة.', en: "It seems your question needs more specific attention. You can contact us directly." } },
  ];

  for (const s of aiSettings) {
    await prisma.aiSettings.upsert({
      where: { key: s.key },
      create: s,
      update: { value: s.value },
    });
  }

  // Add Gemini Provider
  await prisma.aiProvider.upsert({
    where: { name: 'Gemini' },
    create: {
      name: 'Gemini',
      modelName: 'gemini-1.5-pro',
      apiKey: 'AIzaSyCeHHK07FmxQQacEzHOdldNa1bSoOYLLH8',
      priority: 1,
      isActive: true,
    },
    update: {
      modelName: 'gemini-1.5-pro',
      apiKey: 'AIzaSyCeHHK07FmxQQacEzHOdldNa1bSoOYLLH8',
      isActive: true,
    },
  });

  console.log('    ✓ AI settings and Gemini Provider seeded');
}

// ========================= HOSPITALS =========================

async function seedHospitals() {
  console.log('  → Seeding hospitals...');
  const hospitalDefs = seedData.hospitals;

  const hospitals: Record<string, any> = {};
  for (const h of hospitalDefs) {
    const hospital = await prisma.hospital.upsert({
      where: { slug: h.slug },
      create: {
        slug: h.slug,
        name: h.name,
        shortDescription: h.shortDescription,
        description: h.description,
        logoUrl: h.logoUrl,
        heroImage: h.heroImage,
        brandColor: h.brandColor,
        status: h.status as any,
        metaTitle: (h as any).metaTitle,
        metaDescription: (h as any).metaDescription,
        departments: h.departments,
        locations: h.locations,
      },
      update: { 
        name: h.name, 
        status: h.status as any,
        departments: h.departments,
        locations: h.locations
      },
    });
    hospitals[h.slug] = hospital;
  }

  console.log(`    ✓ ${hospitalDefs.length} hospitals seeded`);
  return hospitals;
}

// ========================= MEDICAL CENTERS =========================

/**
 * Parses the CENTER rows out of business/brand/ENTITY_REGISTRY.md.
 *
 * The registry states the rule and now the code obeys it: "an entity that is
 * not in this file does not exist", and "the same table governs
 * prisma/seed.ts". Reading the table directly means the seed cannot drift from
 * the registry — the divergence stops being something to detect and becomes
 * something that cannot happen.
 *
 * The table is machine-parsed by design. Keep the column order and one entity
 * per row; a malformed row is skipped with a warning rather than silently
 * ignored.
 */
function readRegistryCenters() {
  const registryPath = path.resolve(__dirname, 'ENTITY_REGISTRY.md');
  if (!fs.existsSync(registryPath)) {
    throw new Error(`ENTITY_REGISTRY.md not found at ${registryPath} — refusing to seed centres from nothing.`);
  }

  /** Registry names hospitals as "Future" / "Delta"; the database uses slugs. */
  const HOSPITAL_SLUG: Record<string, string> = {
    Future: 'future-hospital',
    Delta: 'delta-hospital',
  };

  const rows: Array<{
    id: string;
    nameEn: string;
    nameAr: string;
    hospitalSlugs: string[];
  }> = [];

  for (const line of fs.readFileSync(registryPath, 'utf8').split('\n')) {
    if (!/^\|\s*CEN-\d+/.test(line)) continue;
    const cells = line.split('|').map((c) => c.trim());
    // Leading and trailing empties from the outer pipes.
    const [, id, nameEn, nameAr, level, , hospitals] = cells;
    if (level !== 'CENTER') continue;

    const slugs = hospitals
      .split(',')
      .map((h) => HOSPITAL_SLUG[h.trim()])
      .filter(Boolean);

    if (!id || !nameAr || slugs.length === 0) {
      console.warn(`    ! malformed registry row skipped: ${line.slice(0, 60)}`);
      continue;
    }
    rows.push({ id, nameEn, nameAr, hospitalSlugs: slugs });
  }

  return rows;
}

/** "Urology & Laser Surgery Center" → "urology-laser-surgery-center" */
function slugFromEnglishName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function seedMedicalCenters(hospitals: Record<string, any>) {
  console.log('  → Seeding medical centers from ENTITY_REGISTRY.md...');

  const registry = readRegistryCenters();

  // seed-data.json supplies CONTENT (clinics, booking questions, imagery); the
  // registry supplies IDENTITY (which centres exist, and at which hospitals).
  // Content is matched on registryId so a renamed centre keeps its content.
  const contentByRegistryId: Record<string, any> = {};
  for (const c of seedData.medicalCenters as any[]) {
    if (c.registryId) contentByRegistryId[c.registryId] = c;
  }

  const centers: Record<string, any> = {};
  let created = 0;

  for (const entry of registry) {
    const content = contentByRegistryId[entry.id] ?? {};
    const slug = content.slug ?? slugFromEnglishName(entry.nameEn);
    const { clinics, bookingQuestions } = content;

    // The registry's Arabic name wins. A near-match name — "مركز القلب
    // والأوعية الدموية" against the registry's "مركز القلب والباطنة وإحالة
    // الرعايات الحرجة" — is worse than an obviously wrong one, because it looks
    // joined and is not.
    const name = { ar: entry.nameAr, en: entry.nameEn };

    const primaryHospital = hospitals[entry.hospitalSlugs[0]];

    const center = await prisma.medicalCenter.upsert({
      where: { slug },
      create: {
        slug,
        name,
        isFeatured: content.isFeatured ?? false,
        status: 'PUBLISHED' as any,
        description: content.description ?? { ar: '', en: '' },
        customFields: { registryId: entry.id },
        clinics:
          clinics?.length && primaryHospital
            ? { create: clinics.map((cl: any) => ({ ...cl, hospitalId: primaryHospital.id })) }
            : undefined,
        bookingQuestions: bookingQuestions?.length ? { create: bookingQuestions } : undefined,
      },
      update: {
        name,
        status: 'PUBLISHED' as any,
        customFields: { registryId: entry.id },
        clinics:
          clinics?.length && primaryHospital
            ? { deleteMany: {}, create: clinics.map((cl: any) => ({ ...cl, hospitalId: primaryHospital.id })) }
            : { deleteMany: {} },
        bookingQuestions: bookingQuestions?.length
          ? { deleteMany: {}, create: bookingQuestions }
          : { deleteMany: {} },
      },
    });

    centers[slug] = center;
    created++;

    // Junction rows come from the registry's Hospitals column — this is the
    // scope boundary the receptionist enforces. Centres 5–12 run at Delta only,
    // and a stale link here would let the Future page offer one.
    const wanted = entry.hospitalSlugs.map((s) => hospitals[s]?.id).filter(Boolean);

    await prisma.hospitalMedicalCenter.deleteMany({
      where: { medicalCenterId: center.id, hospitalId: { notIn: wanted } },
    });

    for (const hospitalId of wanted) {
      await prisma.hospitalMedicalCenter.upsert({
        where: { hospitalId_medicalCenterId: { hospitalId, medicalCenterId: center.id } },
        create: { hospitalId, medicalCenterId: center.id },
        update: {},
      });
    }
  }

  // Anything in the database that the registry does not list. Not deleted —
  // it may have appointments attached — but named loudly, because under the
  // registry's own rule it does not exist.
  const registrySlugs = Object.keys(centers);
  const orphans = await prisma.medicalCenter.findMany({
    where: { slug: { notIn: registrySlugs } },
    select: { slug: true, name: true },
  });
  for (const o of orphans) {
    console.warn(`    ! "${o.slug}" is in the database but NOT in ENTITY_REGISTRY.md — add it there or remove it`);
  }

  console.log(`    ✓ ${created} medical centers seeded from the registry`);
  return centers;
}
async function seedNavigation() {
  console.log('  → Seeding navigation items...');

  const headerNav = [
    { label: { ar: 'الرئيسية', en: 'Home' }, target: '/', location: 'header', order: 1, isVisible: true },
    { label: { ar: 'عن المجموعة', en: 'About' }, target: '/about', location: 'header', order: 2, isVisible: true },
    { label: { ar: 'مستشفياتنا', en: 'Our Hospitals' }, target: '/hospitals', location: 'header', order: 3, isVisible: true },
    { label: { ar: 'مراكزنا الطبية', en: 'Our Medical Centers' }, target: '/medical-centers', location: 'header', order: 4, isVisible: true },
    { label: { ar: 'الأخبار والأنشطة', en: 'News & Media' }, target: '/news', location: 'header', order: 5, isVisible: true },
    { label: { ar: 'تواصل معنا', en: 'Contact Us' }, target: '/contact', location: 'header', order: 6, isVisible: true },
  ];

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

  for (const item of [...headerNav, ...footerNav]) {
    // Use a composite key — find by target + location + order
    const existing = await prisma.navigationItem.findFirst({
      where: { target: item.target, location: item.location },
    });

    if (existing) {
      await prisma.navigationItem.update({
        where: { id: existing.id },
        data: item,
      });
    } else {
      await prisma.navigationItem.create({ data: item });
    }
  }

  console.log('    ✓ Navigation items seeded');
}

// ========================= PAGES =========================

async function seedPages() {
  console.log('  → Seeding pages...');

  const pages = [
    {
      slug: 'home',
      type: 'standard',
      title: { ar: 'الرئيسية', en: 'Home' },
      status: 'PUBLISHED' as const,
      metaTitle: { ar: 'منظومة إنسان للرعاية الصحية', en: 'INSAN Healthcare Platform' },
      metaDescription: { ar: 'منظومة إنسان — منصة مصرية متكاملة', en: 'INSAN — An integrated Egyptian healthcare platform' },
      robotsIndex: true,
    },
    { slug: 'about', type: 'standard', title: { ar: 'عن المجموعة', en: 'About INSAN' }, status: 'PUBLISHED' as const, robotsIndex: true },
    { slug: 'hospitals', type: 'standard', title: { ar: 'مستشفياتنا', en: 'Our Hospitals' }, status: 'PUBLISHED' as const, robotsIndex: true },
    { slug: 'medical-centers', type: 'standard', title: { ar: 'مراكزنا الطبية', en: 'Our Medical Centers' }, status: 'PUBLISHED' as const, robotsIndex: true },
    { slug: 'news', type: 'standard', title: { ar: 'الأخبار والأنشطة', en: 'News & Media' }, status: 'PUBLISHED' as const, robotsIndex: true },
    { slug: 'contact', type: 'standard', title: { ar: 'تواصل معنا', en: 'Contact Us' }, status: 'PUBLISHED' as const, robotsIndex: true },
    { slug: 'investors', type: 'hidden', title: { ar: 'المستثمرون', en: 'Investors' }, status: 'PUBLISHED' as const, robotsIndex: false },
    { slug: 'privacy', type: 'legal', title: { ar: 'سياسة الخصوصية', en: 'Privacy Policy' }, status: 'PUBLISHED' as const, robotsIndex: true },
    { slug: 'terms', type: 'legal', title: { ar: 'شروط الاستخدام', en: 'Terms of Use' }, status: 'PUBLISHED' as const, robotsIndex: true },
  ];

  for (const page of pages) {
    const p = await prisma.page.upsert({
      where: { slug: page.slug },
      create: page,
      update: { title: page.title, status: page.status },
    });

    // Add default sections for all pages so they appear in admin panel
    const existingHero = await prisma.section.findFirst({
      where: { pageId: p.id, componentType: 'Hero' },
    });
    
    if (!existingHero) {
      await prisma.section.create({
        data: {
          pageId: p.id,
          componentType: 'Hero',
          order: 1,
          isVisible: true,
          config: {
            title: page.title,
            subtitle: { ar: 'وصف قصير تجريبي لهذه الصفحة', en: 'A short dummy description for this page' },
            ...(page.slug === 'home' ? {
              title: { ar: 'منظومة إنسان للرعاية الصحية', en: 'INSAN Healthcare Platform' },
              subtitle: { ar: 'نبني مؤسسات صحية قوية ومستدامة', en: 'Building strong and sustainable healthcare institutions' },
              ctas: [
                { label: { ar: 'اكتشف منظومتنا', en: 'Explore Our Ecosystem' }, href: '/hospitals' },
                { label: { ar: 'تواصل معنا', en: 'Contact Us' }, href: '/contact' },
              ],
            } : page.slug === 'about' ? {
              title: { ar: 'منظومة إنسان للرعاية الصحية', en: 'INSAN Healthcare Ecosystem' },
              subtitle: { ar: 'أساس الخدمة الطبية احترام الإنسان', en: 'Respect for the human being is the foundation of medical service.' },
              ctas: [
                { label: { ar: 'احجز موعدك الآن', en: 'Book an Appointment' }, href: '/contact' },
                { label: { ar: 'تصفح مراكزنا الطبية', en: 'Explore Medical Centers' }, href: '/medical-centers' },
              ],
            } : {})
          },
        },
      });
    }

    const existingContent = await prisma.section.findFirst({
      where: { pageId: p.id, componentType: 'TextContent' },
    });
    
    if (!existingContent) {
      await prisma.section.create({
        data: {
          pageId: p.id,
          componentType: 'TextContent',
          order: 2,
          isVisible: true,
          config: {
            heading: { 
              ar: page.slug === 'about' ? 'من نحن' : 'محتوى الصفحة', 
              en: page.slug === 'about' ? 'Who We Are' : 'Page Content' 
            },
            content: { 
              ar: page.slug === 'about' ? 
`"إنسان" ليست مجرد مستشفى، بل هي منصة شاملة لإدارة وتطوير وتحويل مؤسسات الرعاية الصحية. نعمل على توحيد معايير الجودة والتشغيل لتوفير مسار علاجي سلس وآمن، يبدأ من العيادات الخارجية والمراكز المتخصصة، وصولاً إلى غرف العمليات ووحدات العناية المركزة.

رؤيتنا طويلة المدى هي أن نصبح المنصة الرائدة للرعاية الصحية في مصر، من خلال الارتقاء بالمؤسسات الطبية تحت نظام تشغيلي وهوية واحدة، تضع المريض دائماً في المركز.

### شبكة "إنسان"
نحن ندير ونوجه مجموعة من أبرز المستشفيات والمراكز المتخصصة، لضمان أعلى مستويات الرعاية:
- **مستشفى المستقبل التخصصي:** رمز القيادة والابتكار، توفر رعاية متقدمة عبر أحدث التقنيات.
- **مستشفى الدلتا الدولي:** إعادة بناء الثقة، من خلال تقديم خدمات طبية موثوقة وآمنة.
- **المراكز الطبية التخصصية:** ندير 12 مركزاً طبياً متخصصاً، مثل مركز القلب والباطنة، ومركز صحة المرأة والطفل، تعمل جميعها بمعايير "إنسان" الطبية الفائقة.

### فلسفتنا في الرعاية
كل قرار طبي وإداري في منظومة إنسان ينبع من فلسفة واضحة:
- **احترام وقتك:** نعمل بجد لتقليل أوقات الانتظار.
- **لغة تفهمها:** نشرح لك حالتك بلغة واضحة وشفافة.
- **الرعاية الضرورية فقط:** نلتزم بأعلى درجات الأمانة الطبية.
- **الكرامة أولاً:** حماية كرامة المريض وخصوصيته هي قاعدة أساسية.`
              : 'هذا محتوى تجريبي يظهر في لوحة التحكم ويمكن تعديله لاحقاً.', 
              en: page.slug === 'about' ? 'INSAN is a comprehensive platform for managing and transforming healthcare institutions. Our vision is to become the leading healthcare platform in Egypt.' : 'This is dummy content that appears in the admin panel and can be edited later.' 
            }
          },
        },
      });
    }
  }

  console.log('    ✓ Pages seeded');
}

// ========================= NEWS CATEGORIES =========================

async function seedNewsCategories() {
  console.log('  → Seeding news categories...');

  const categories = [
    { name: { ar: 'أخبار المنظومة', en: 'Ecosystem News' }, slug: 'ecosystem-news' },
    { name: { ar: 'أخبار المستشفيات', en: 'Hospital News' }, slug: 'hospital-news' },
    { name: { ar: 'أخبار المراكز الطبية', en: 'Medical Center News' }, slug: 'medical-center-news' },
    { name: { ar: 'الأحداث والأنشطة', en: 'Events & Activities' }, slug: 'events' },
    { name: { ar: 'نصائح طبية', en: 'Health Tips' }, slug: 'health-tips' },
  ];

  for (const cat of categories) {
    await prisma.newsCategory.upsert({
      where: { slug: cat.slug },
      create: cat,
      update: { name: cat.name },
    });
  }

  console.log('    ✓ News categories seeded');
}

// ========================= KNOWLEDGE BASE =========================

async function seedKnowledgeBase() {
  console.log('  → Seeding AI knowledge base...');

  const entries = [
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
      answer: { ar: 'للعناوين التفصيلية، يرجى زيارة صفحة "تواصل معنا".', en: 'For detailed addresses, please visit the "Contact Us" page.' },
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

  for (const entry of entries) {
    const existing = await prisma.aiKnowledgeBase.findFirst({
      where: { category: entry.category },
    });
    if (!existing) {
      await prisma.aiKnowledgeBase.create({ data: entry });
    }
  }

  console.log('    ✓ AI knowledge base seeded');
}

// ========================= MEDIA FOLDERS =========================

async function seedMediaFolders() {
  console.log('  → Seeding media folders...');

  const rootFolders = ['Hospitals', 'Medical Centers', 'Doctors', 'News', 'General', 'Logos & Brand'];
  const folderMap: Record<string, any> = {};

  for (const name of rootFolders) {
    const existing = await prisma.mediaFolder.findFirst({ where: { name, parentId: null } });
    if (!existing) {
      const folder = await prisma.mediaFolder.create({ data: { name, parentId: null } });
      folderMap[name] = folder;
    } else {
      folderMap[name] = existing;
    }
  }

  // Sub-folders under Hospitals
  const hospitalsFolderExisting = await prisma.mediaFolder.findFirst({ where: { name: 'Future Hospital', parentId: folderMap['Hospitals'].id } });
  if (!hospitalsFolderExisting) {
    await prisma.mediaFolder.create({ data: { name: 'Future Hospital', parentId: folderMap['Hospitals'].id } });
    await prisma.mediaFolder.create({ data: { name: 'Delta Hospital', parentId: folderMap['Hospitals'].id } });
  }

  console.log('    ✓ Media folders seeded');
}

// ========================= TESTIMONIALS =========================

async function seedTestimonials() {
  console.log('  → Seeding testimonials...');
  const testimonialDefs = seedData.testimonials;

  for (const t of testimonialDefs) {
    await prisma.testimonial.create({
      data: {
        name: t.name,
        audience: t.audience as any,
        quote: t.quote,
        status: t.status as any,
        order: t.order,
      }
    });
  }

  console.log(`    ✓ ${testimonialDefs.length} testimonials seeded`);
}

// ========================= DOCTORS =========================

async function seedDoctors(hospitals: Record<string, any>, medicalCenters: Record<string, any>) {
  console.log('  → Seeding doctors...');
  const doctorDefs = seedData.doctors;

  for (const d of doctorDefs) {
    const { hospitalSlugs, medicalCenterSlugs, ...docData } = d;

    const doctor = await prisma.doctor.upsert({
      where: { slug: d.slug },
      create: { ...docData, status: 'PUBLISHED' as any },
      update: { ...docData, status: 'PUBLISHED' as any },
    });

    // Link hospitals
    for (const hSlug of hospitalSlugs) {
      const h = hospitals[hSlug];
      if (h) {
        await prisma.doctorHospital.upsert({
          where: { doctorId_hospitalId: { hospitalId: h.id, doctorId: doctor.id } },
          create: { hospitalId: h.id, doctorId: doctor.id },
          update: {}
        });
      }
    }

    // Link centers
    for (const cSlug of medicalCenterSlugs) {
      const c = medicalCenters[cSlug];
      if (c) {
        await prisma.doctorMedicalCenter.upsert({
          where: { doctorId_medicalCenterId: { medicalCenterId: c.id, doctorId: doctor.id } },
          create: { medicalCenterId: c.id, doctorId: doctor.id },
          update: {}
        });
      }
    }
  }
  
  console.log(`    ✓ ${doctorDefs.length} doctors seeded`);
}

// ========================= NEWS POSTS =========================

async function seedNewsPosts() {
  console.log('  → Seeding news posts...');
  const newsDefs = seedData.newsPosts;

  for (const n of newsDefs) {
    const { categorySlug, ...postData } = n;
    const cat = await prisma.newsCategory.findUnique({ where: { slug: categorySlug } });

    if (cat) {
      await prisma.newsPost.upsert({
        where: { slug: n.slug },
        create: { ...postData, status: 'PUBLISHED' as any, categoryId: cat.id },
        update: { ...postData, status: 'PUBLISHED' as any, categoryId: cat.id },
      });
    }
  }

  console.log(`    ✓ ${newsDefs.length} news posts seeded`);
}

// ========================= FEATURE FLAGS =========================

async function seedFeatureFlags() {
  console.log('  → Seeding feature flags...');

  const flags = [
    { key: 'ai_chat_enabled', isEnabled: true, description: 'Enable/disable AI chat widget globally' },
    { key: 'social_sync_enabled', isEnabled: false, description: 'Enable/disable social media sync worker' },
    { key: 'appointment_booking_enabled', isEnabled: true, description: 'Enable/disable appointment booking form' },
  ];

  for (const flag of flags) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      create: flag,
      update: { description: flag.description },
    });
  }

  console.log('    ✓ Feature flags seeded');
}

// ========================= BRANDS =========================

async function seedBrands() {
  console.log('  → Seeding brands...');

  const brandDefs = [
    {
      code: 'INSAN',
      displayName: { ar: 'مجموعة إنسان', en: 'INSAN Group' },
      socialAccounts: [
        { provider: 'facebook_page_insan', platform: 'FACEBOOK' as const, pageId: 'placeholder', pageName: 'INSAN Healthcare', isPrimary: true },
        { provider: 'instagram_page_insan', platform: 'INSTAGRAM' as const, pageId: 'placeholder', pageName: 'INSAN Healthcare', isPrimary: false },
        { provider: 'linkedin_page_insan', platform: 'LINKEDIN' as const, pageId: 'placeholder', pageName: 'INSAN Healthcare', isPrimary: false },
      ],
    },
    {
      code: 'FUTURE',
      displayName: { ar: 'مستشفى المستقبل التخصصي', en: 'Future Specialized Hospital' },
      socialAccounts: [
        { provider: 'facebook_page_future', platform: 'FACEBOOK' as const, pageId: 'placeholder', pageName: 'Future Specialized Hospital', isPrimary: true },
      ],
    },
    {
      code: 'DELTA',
      displayName: { ar: 'مستشفى الدلتا الدولي', en: 'Delta International Hospital' },
      socialAccounts: [
        { provider: 'facebook_page_delta', platform: 'FACEBOOK' as const, pageId: 'placeholder', pageName: 'Delta International Hospital', isPrimary: true },
      ],
    },
  ];

  for (const brandDef of brandDefs) {
    const { socialAccounts, ...brandData } = brandDef;

    const brand = await prisma.brand.upsert({
      where: { code: brandData.code },
      create: { ...brandData, isActive: true },
      update: { displayName: brandData.displayName },
    });

    for (const account of socialAccounts) {
      const { provider, ...accountData } = account;
      const integration = await prisma.integrationSetting.findUnique({ where: { provider } });

      const existing = await prisma.brandSocialAccount.findFirst({
        where: { brandId: brand.id, platform: accountData.platform },
      });

      if (!existing) {
        await prisma.brandSocialAccount.create({
          data: {
            brandId: brand.id,
            platform: accountData.platform,
            pageId: accountData.pageId,
            pageName: accountData.pageName,
            isPrimary: accountData.isPrimary,
            isActive: false, // inactive until real page IDs are configured
            integrationSettingId: integration?.id ?? null,
          },
        });
      }
    }
  }

  console.log('    ✓ 3 brands seeded (INSAN, FUTURE, DELTA)');
}

// ========================= RECEPTIONIST =========================

async function seedServiceAreas(hospitals: Record<string, any>) {
  console.log('  → Seeding service areas...');

  // Rows live in receptionist/data/service-areas.json, where each one carries
  // its source document and a confidence level. Nothing is invented here: an
  // unsourced row sends a real patient to the wrong city, and a governorate
  // with no row yields AMBIGUOUS — the receptionist asks instead of guessing.
  // Remaining catchments: receptionist/docs/NEEDS_OPERATOR.md §1
  const areaPath = path.resolve(__dirname, '../../../../receptionist/data/service-areas.json');
  if (!fs.existsSync(areaPath)) {
    console.warn('    ! receptionist/data/service-areas.json not found — skipped');
    return;
  }
  const areaDefs: Array<{
    hospitalSlug: string;
    governorate: string;
    district: string;
    priority: number;
  }> = JSON.parse(fs.readFileSync(areaPath, 'utf8')).areas;

  let seeded = 0;
  for (const def of areaDefs) {
    const hospital = hospitals[def.hospitalSlug];
    if (!hospital) {
      console.warn(`    ! hospital ${def.hospitalSlug} not found — service area skipped`);
      continue;
    }
    await prisma.serviceArea.upsert({
      where: {
        hospitalId_governorate_district: {
          hospitalId: hospital.id,
          governorate: def.governorate,
          district: def.district,
        },
      },
      create: {
        hospitalId: hospital.id,
        governorate: def.governorate,
        district: def.district,
        priority: def.priority,
      },
      update: { priority: def.priority, isActive: true },
    });
    seeded++;
  }

  console.log(`    ✓ ${seeded} service area(s) seeded`);
  console.log('    ⚠ Geography routing is incomplete — see receptionist/docs/NEEDS_OPERATOR.md §1');
}


async function seedBrandPersonas() {
  console.log('  → Seeding brand personas...');

  // Persona text lives in receptionist/prompts/brands/*.md — reviewed in git,
  // loaded here. The Delta file in particular carries hard constraints lifted
  // from HOSPITAL_DELTA.md §Never Promise, which bind the receptionist exactly
  // as they bind a campaign. Keeping that text in a TypeScript string literal
  // would put a brand-owner document somewhere a brand owner will never look.
  const promptsDir = path.resolve(__dirname, '../../../../receptionist/prompts/brands');

  /** Minimal front-matter reader — avoids a yaml dependency for four keys. */
  function parsePersonaFile(raw: string) {
    const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(raw);
    if (!m) throw new Error('missing front matter');
    const fm = m[1];
    const body = m[2];

    const scalar = (key: string): string => {
      const r = new RegExp('^' + key + ':\\s*(.+)$', 'm').exec(fm);
      return r ? r[1].trim() : '';
    };

    const bilingual = (key: string): Record<string, string> => {
      const block = new RegExp('^' + key + ':\\r?\\n((?:[ ]{2}\\w+:.*\\r?\\n?)+)', 'm').exec(fm);
      const out: Record<string, string> = {};
      if (block) {
        for (const line of block[1].split('\n')) {
          const kv = /^[ ]{2}(\w+):\s*(.+)$/.exec(line.replace(/\r$/, ''));
          if (kv) out[kv[1]] = kv[2].trim();
        }
      }
      return out;
    };

    // The body splits at the business-rules heading: everything before it
    // belongs to the brand owner, everything after belongs to operations.
    const HEADING = '# قواعد العمل';
    const split = body.indexOf(HEADING);
    if (split < 0) throw new Error("missing '" + HEADING + "' heading");

    return {
      brandCode: scalar('brandCode'),
      entryMode: scalar('entryMode') as 'DIRECT' | 'ROUTER',
      displayName: bilingual('displayName'),
      greeting: bilingual('greeting'),
      persona: body.slice(0, split).replace(/<!--[\s\S]*?-->/g, '').trim(),
      businessRules: body.slice(split).trim(),
    };
  }

  const files = fs.readdirSync(promptsDir).filter((f) => f.endsWith('.md'));
  let seeded = 0;

  for (const file of files) {
    let def: ReturnType<typeof parsePersonaFile>;
    try {
      def = parsePersonaFile(fs.readFileSync(path.join(promptsDir, file), 'utf8'));
    } catch (e: any) {
      console.warn('    ! ' + file + ': ' + e.message + ' — skipped');
      continue;
    }

    const brand = await prisma.brand.findUnique({ where: { code: def.brandCode } });
    if (!brand) {
      console.warn('    ! brand ' + def.brandCode + ' not found — persona skipped');
      continue;
    }

    await prisma.brandPersona.upsert({
      where: { brandId: brand.id },
      create: {
        brandId: brand.id,
        entryMode: def.entryMode,
        displayName: def.displayName,
        greeting: def.greeting,
        persona: def.persona,
        businessRules: def.businessRules,
      },
      // Re-seeding restores the reviewed baseline from git. That is the point
      // of holding these in files: the admin can iterate live, and a seed run
      // puts the reviewed text back.
      update: {
        entryMode: def.entryMode,
        persona: def.persona,
        businessRules: def.businessRules,
      },
    });
    seeded++;
  }

  console.log('    ✓ ' + seeded + ' brand personas seeded from receptionist/prompts/brands/');
}

/**
 * Overlays the verified hospital facts from receptionist/data/hospitals.json
 * onto the Hospital rows.
 *
 * seed-data.json is placeholder content, entered to exercise the admin panel —
 * it still records Delta in Mohandeseen, Giza, roughly 100km and one
 * governorate away from Tanta. hospitals.json is extracted from the operator's
 * own PDFs and is the source of truth for location, contact and hours.
 *
 * Confidence is respected: a fact marked `conflict` (two source documents
 * disagree) or `provisional` is NOT written. Leaving the field empty makes the
 * receptionist say it will check; writing a contested fact makes it state one
 * confidently.
 */
async function seedHospitalFacts() {
  console.log('  → Overlaying verified hospital facts...');

  const factsPath = path.resolve(__dirname, '../../../../receptionist/data/hospitals.json');
  if (!fs.existsSync(factsPath)) {
    console.warn('    ! receptionist/data/hospitals.json not found — skipped');
    return;
  }

  const file = JSON.parse(fs.readFileSync(factsPath, 'utf8'));
  const servable = (c: string) => c === 'stated' || c === 'derived';

  let applied = 0;
  let withheld = 0;

  for (const f of file.hospitals ?? []) {
    const hospital = await prisma.hospital.findUnique({ where: { slug: f.slug } });
    if (!hospital) {
      console.warn(`    ! hospital ${f.slug} not found — facts skipped`);
      continue;
    }

    const data: Record<string, unknown> = {};

    if (servable(f.location?.confidence)) {
      // Replaces the placeholder locations array entirely. A hospital with one
      // real address should not keep a test branch alongside it — the operator
      // confirmed there are no branches.
      data.locations = [
        {
          name: { ar: 'المقر الرئيسي', en: 'Main Building' },
          address: f.location.address,
          governorate: f.location.governorate,
          district: f.location.district,
        },
      ];
      applied++;
    } else {
      withheld++;
    }

    const contact: Record<string, unknown> = {};
    if (servable(f.contact?.confidence)) {
      if (f.contact.phones?.length) contact.phones = f.contact.phones;
      if (f.contact.whatsapp) contact.whatsapp = f.contact.whatsapp;
      if (f.contact.website) contact.website = f.contact.website;
      if (f.contact.email) contact.email = f.contact.email;
      applied++;
    } else {
      // Future's numbers render as nine digits where Cairo landlines have
      // eight — recorded as CONF-05 and withheld until the operator confirms.
      // A wrong number turns a qualified lead into a dead end.
      withheld++;
    }

    const hours: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(f.hours ?? {})) {
      const v = value as { ar: string; en: string; confidence: string };
      if (servable(v.confidence)) hours[key] = { ar: v.ar, en: v.en };
    }
    if (Object.keys(hours).length) contact.hours = hours;

    if (Object.keys(contact).length) data.contactInfo = contact;

    if (Object.keys(data).length === 0) continue;

    await prisma.hospital.update({ where: { id: hospital.id }, data });
  }

  const open = (file.conflicts ?? []).filter((c: any) => c.status === 'open');
  console.log(`    ✓ ${applied} verified fact group(s) applied, ${withheld} withheld`);
  if (open.length) {
    console.log(`    ⚠ ${open.length} open conflict(s) — those facts stay withheld from patients:`);
    for (const c of open) console.log(`        ${c.id} (${c.severity}) ${c.subject}`);
  }
}

// ========================= MAIN =========================

async function main() {
  console.log('🌱 Starting database seed...');
  console.log('');

  // Order matters — later seeders depend on earlier ones
  const roles = await seedRoles();
  await seedSuperAdmin(roles);
  await seedSettings();
  await seedIntegrationSettings();
  await seedBrands(); // must run after seedIntegrationSettings
  await seedAiSettings();
  const hospitals = await seedHospitals();
  const medicalCenters = await seedMedicalCenters(hospitals);
  await seedDoctors(hospitals, medicalCenters);
  await seedNavigation();
  await seedPages();
  await seedNewsCategories();
  await seedNewsPosts();
  await seedKnowledgeBase();
  await seedMediaFolders();
  // Clear old testimonials before re-seeding
  await prisma.testimonial.deleteMany();
  await seedTestimonials();
  await seedFeatureFlags();
  await seedBrandPersonas();      // after seedBrands
  await seedServiceAreas(hospitals);
  await seedHospitalFacts();      // after seedHospitals

  console.log('');
  console.log('✅ Seed complete!');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
