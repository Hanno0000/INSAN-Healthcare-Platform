# خطة تنفيذ: إعادة تصميم صفحات المستشفيات — النسخة 2 (منقّحة وجاهزة للتنفيذ)

**نسخة مصحّحة من `implementation_plan.md`** بعد مراجعة الكود الفعلي.
**اقرأ أولاً:** [`CODE_REVIEW_2026-07-28.md`](./CODE_REVIEW_2026-07-28.md)

---

# ⛔ الجزء 0 — قواعد ملزِمة. اقرأها كاملة قبل أن تكتب حرفاً واحداً

أنت منفِّذ. لست مصمّماً ولا معمارياً. مهمتك تنفيذ الخطوات المكتوبة أدناه **بالحرف**.

### القواعد

1. **نفّذ الخطوات بالترتيب الرقمي.** لا تقفز. لا تبدأ الخطوة 12 قبل أن تنتهي الخطوة 11 وتنجح في فحصها.
2. **لا تعدّل أي ملف غير مذكور صريحاً في هذه الخطة.** إن ظننت أن ملفاً آخر يحتاج تعديلاً — **توقّف واسأل الإنسان**.
3. **لا تبتكر.** لا تضف حقولاً، ولا مكوّنات، ولا endpoints، ولا مكتبات، ولا «تحسينات». إن لم يكن مكتوباً هنا، فهو ليس من عملك.
4. **لا تحذف كوداً موجوداً** إلا حيث تقول الخطوة صريحاً «احذف».
5. **بعد كل خطوة، شغّل فحص التحقّق (`✅ التحقّق`).** إن فشل — **توقّف**. لا تكمل. لا تحاول إصلاحه بطريقتك. أبلِغ الإنسان بنص الخطأ.
6. **الأوامر الممنوعة — لا تشغّلها إطلاقاً، مهما بدا لك أنها الحل:**
   ```
   prisma migrate dev
   prisma migrate reset
   prisma db push
   ```
   > **السبب:** قاعدة بيانات الإنتاج مُنحرِفة عن ملفات الـ migrations (بها 4 جداول لا يعرفها تاريخ الـ migrations). الأمر `prisma migrate dev` سيكتشف هذا الانحراف ويطلب **مسح قاعدة البيانات بالكامل** — أي فقدان كل بيانات المرضى والمواعيد. الأمر الآمن الوحيد هو `prisma migrate deploy`.
7. **لغة الواجهة:** كل النصوص الظاهرة للمستخدم بالعربية. اتجاه الصفحة RTL (مضبوط أصلاً في `layout.tsx` — لا تلمسه).
8. **لا تشتغل على `main` مباشرة.** أنشئ فرعاً (الخطوة 1).
9. **مجلد `apps/admin/` كود ميّت — لا يُبنى ولا يُنشر. لا تعدّله ولا تضف فيه شيئاً.** لوحة الأدمن الحقيقية هي `apps/web/app/admin/`.
10. **عند كتابة استعلام Prisma، لا تخمّن أسماء الحقول.** كل اسم تحتاجه مكتوب في هذه الخطة. لو احتجت اسماً غير مذكور — توقّف واسأل.

### معلومات ثابتة يجب أن تعرفها (لا تخالفها)

| الحقيقة | القيمة الصحيحة | الخطأ الشائع |
|---------|----------------|--------------|
| حقل ربط الخبر بالمستشفى في `NewsPost` | **`relatedHospitalId`** | ❌ `hospitalId` — غير موجود |
| اسم العلاقة في `NewsPost` | **`relatedHospital`** | ❌ `hospital` |
| موديل `Clinic` يحتوي على | `id`, `medicalCenterId`, `name` (Json), `schedule` (Json) | ❌ لا يوجد حقل «تخصص» |
| العيادات مرتبطة بـ | **المركز الطبي** فقط | ❌ ليست مرتبطة بالمستشفى مباشرة |
| ربط الطبيب بقسم | **لا يوجد في قاعدة البيانات** — سنخزّن `doctorIds` داخل الـ Json | ❌ لا تحاول استعلام `department` على `Doctor` |
| عدد الحقول الجديدة | **6** (لا 5) | ❌ خمسة |
| مجلد لوحة الأدمن | `apps/web/app/admin/` | ❌ `apps/admin/` |

### الفخّ الأخطر في هذا المشروع — افهمه الآن

الملف `apps/api/src/main.ts` يحتوي على:
```ts
new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false, ... })
```

معنى هذا: **أي حقل ترسله لـ API ولم تعرّفه في الـ DTO، يُحذف بصمت — بلا خطأ، بلا تحذير، بلا شيء في الـ logs.**

النتيجة العملية: لو أضفت حقلاً في `schema.prisma` وفي واجهة الأدمن، ونسيت إضافته في `create-hospital.dto.ts`، سيحدث الآتي: المستخدم يكتب البيانات → يضغط «حفظ» → تظهر رسالة «تم التحديث بنجاح» → **وقيمة الحقل تبقى `null` إلى الأبد**.

**لهذا الخطوة 4 (تعديل الـ DTO) ليست اختيارية. بدونها كل عملك ضائع.**

---

# 🎯 الجزء 1 — ما ستبنيه بالضبط

صفحة كل مستشفى (`/hospitals/[slug]`) تتحوّل من صفحة واحدة بسيطة إلى **7 سيكشنات**:

| # | السيكشن | مصدر البيانات | ملف المرجع البصري |
|---|---------|---------------|-------------------|
| 1 | Hero المستشفى | `name` + `heroTagline` + `heroStats` + `heroImage` | `components/public/HeroSection.tsx` |
| 2 | العيادات الخارجية | `medicalCenters[].medicalCenter.clinics[]` | كاردات جديدة بسيطة |
| 3 | أقسام المستشفى | `departments` (Json) | `components/public/HospitalsSection.tsx` |
| 4 | المراكز الطبية التابعة | `medicalCenters[]` | `components/public/FeaturedServicesSection.tsx` |
| 5 | رحلة المريض | `journeySteps` (Json) أو الافتراضي | `components/public/PatientJourneySection.tsx` |
| 6 | أحدث الأخبار | `newsPosts[]` (عبر `relatedHospitalId`) | `components/public/LatestNewsSection.tsx` |
| 7 | التواصل والخريطة | `contactInfo` + `locations` (Json) | `components/public/HomeContactSection.tsx` |

**وصفحة جديدة:** `/hospitals/[slug]/departments/[deptSlug]`

### الحقول الستة الجديدة على موديل `Hospital` — الشكل الدقيق للبيانات

انسخ هذه الأشكال بالحرف. لا تغيّر اسم مفتاح واحد.

```jsonc
// 1) heroTagline — جملة تعريفية ثنائية اللغة
{ "ar": "رعاية متكاملة بمعايير عالمية", "en": "Integrated care, global standards" }

// 2) heroStats — دائماً 3 عناصر بالضبط
[
  { "value": "15", "suffix": "+", "label": { "ar": "سنة خبرة",     "en": "Years" } },
  { "value": "5000","suffix": "+", "label": { "ar": "مريض سنوياً", "en": "Patients" } },
  { "value": "50",  "suffix": "+", "label": { "ar": "طبيب متخصص",  "en": "Doctors" } }
]

// 3) departments — مصفوفة أقسام. slug فريد داخل نفس المستشفى.
[
  {
    "slug": "cardiology",
    "name":  { "ar": "قسم القلب", "en": "Cardiology" },
    "shortDescription": { "ar": "وصف مختصر للكارت", "en": "..." },
    "description":      { "ar": "وصف كامل لصفحة القسم", "en": "..." },
    "image": "https://.../dept.jpg",
    "doctorIds": ["cms31...", "cms32..."]
  }
]

// 4) locations — مصفوفة مواقع للخرائط
[
  { "name": { "ar": "المقر الرئيسي", "en": "Main Branch" },
    "mapsUrl": "https://www.google.com/maps/embed?pb=..." }
]

// 5) contactInfo
{ "phone": "+201234567890",
  "email": "info@hospital.com",
  "address": { "ar": "القاهرة، مصر", "en": "Cairo, Egypt" } }

// 6) journeySteps — دائماً 4 عناصر بالضبط
[
  { "icon": "search",      "title": { "ar": "ابحث عن طبيبك", "en": "..." }, "desc": { "ar": "...", "en": "..." } },
  { "icon": "calendar",    "title": { "ar": "احجز موعدك",    "en": "..." }, "desc": { "ar": "...", "en": "..." } },
  { "icon": "stethoscope", "title": { "ar": "تلقَّ الرعاية",  "en": "..." }, "desc": { "ar": "...", "en": "..." } },
  { "icon": "smile",       "title": { "ar": "تعافَ بسلام",   "en": "..." }, "desc": { "ar": "...", "en": "..." } }
]
```

**قيم `icon` المسموحة — هذه القائمة نهائية:** `search` · `calendar` · `stethoscope` · `smile` · `heart` · `shield` · `users` · `activity`

---

# 🚦 المرحلة أ — التحضير (لا تكتب كوداً بعد)

## الخطوة 1 — أنشئ فرعاً جديداً

```bash
cd website
git checkout -b feature/hospital-pages-redesign
git status
```

**✅ التحقّق:** `git branch --show-current` يطبع `feature/hospital-pages-redesign`.

---

## الخطوة 2 — خذ نسخة احتياطية من قاعدة البيانات (إلزامي)

> **لا تتخطَّ هذه الخطوة.** أنت على وشك تعديل قاعدة بيانات إنتاج بها بيانات مرضى حقيقية.

على السيرفر (`ssh root@169.58.77.61`):

```bash
mkdir -p ~/backups
docker exec insan-api npx prisma db execute --stdin <<< "SELECT 1;" && echo "DB reachable"
```

ثم خُذ النسخة (استخدم `DATABASE_URL` من `.env.production`):

```bash
cd ~/INSAN-Healthcare-Platform/website
DB_URL=$(grep '^DATABASE_URL=' .env.production | cut -d= -f2-)
docker run --rm postgres:16-alpine pg_dump "$DB_URL" > ~/backups/insan-$(date +%Y%m%d-%H%M%S).sql
ls -lh ~/backups/
```

**✅ التحقّق:** الملف موجود وحجمه **أكبر من 100 كيلوبايت**. لو كان الحجم صفراً أو بضعة بايتات → **توقّف. النسخة فشلت. لا تكمل.**

---

## الخطوة 3 — سجّل الحالة الحالية (لتقارن بها لاحقاً)

```bash
curl -s "http://169.58.77.61/api/v1/hospitals?pageSize=50" | head -c 500
curl -s "http://169.58.77.61/api/v1/hospitals/delta-hospital" | head -c 500
```

**✅ التحقّق:** الأمران يرجعان `"success":true`. احفظ اسم أحد الـ slugs (مثلاً `delta-hospital`) — ستستخدمه في كل الفحوص التالية.

---

# 🗄️ المرحلة ب — قاعدة البيانات والـ Backend

## الخطوة 4 — أضف الحقول الستة إلى `schema.prisma`

**الملف:** `apps/api/prisma/schema.prisma`

ابحث عن موديل `Hospital` (يبدأ عند السطر 180). أضف الأسطر الستة الجديدة **بعد** السطر `googleMapsUrl String?` و**قبل** السطر `status ContentStatus @default(DRAFT)`:

```prisma
model Hospital {
  id               String                  @id @default(cuid())
  slug             String                  @unique
  name             Json
  shortDescription Json?
  description      Json?
  logoUrl          String?
  heroImage        String?
  brandColor       String?
  googleMapsUrl    String?
  // ─── حقول صفحة المستشفى الجديدة (6) ───
  heroTagline      Json?
  heroStats        Json?
  departments      Json?
  locations        Json?
  contactInfo      Json?
  journeySteps     Json?
  // ──────────────────────────────────────
  status           ContentStatus           @default(DRAFT)
  metaTitle        Json?
  metaDescription  Json?
  customFields     Json?                   @default("{}")
  createdAt        DateTime                @default(now())
  updatedAt        DateTime                @updatedAt
  appointments     AppointmentRequest[]
  doctors          DoctorHospital[]
  medicalCenters   HospitalMedicalCenter[]
  newsPosts        NewsPost[]

  @@index([status])
}
```

**لا تلمس أي موديل آخر في الملف.**

**✅ التحقّق:**
```bash
cd apps/api && npx prisma validate
```
يجب أن يطبع `The schema at prisma/schema.prisma is valid 🚀`.

---

## الخطوة 5 — اكتب ملف الـ migration **بيدك**

> ⛔ **لا تشغّل `prisma migrate dev`.** اكتب الملف يدوياً كما هو موضّح.

أنشئ المجلد والملف:

**المسار الكامل:** `apps/api/prisma/migrations/20260728120000_hospital_page_fields/migration.sql`

**المحتوى — انسخه بالحرف:**

```sql
-- Migration: إضافة حقول صفحة المستشفى الجديدة (6 حقول Json)
-- كتابة يدوية مقصودة: قاعدة الإنتاج مُنحرِفة، و prisma migrate dev سيطلب reset.
-- كل الأوامر idempotent (IF NOT EXISTS) فيمكن تشغيلها أكثر من مرة بأمان.

ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "heroTagline"  JSONB;
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "heroStats"    JSONB;
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "departments"  JSONB;
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "locations"    JSONB;
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "contactInfo"  JSONB;
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "journeySteps" JSONB;
```

**ملاحظات إلزامية:**
- اسم المجلد **بالضبط** `20260728120000_hospital_page_fields` — 14 رقماً ثم `_` ثم الاسم. أي صيغة أخرى تكسر ترتيب Prisma.
- استخدم **علامات اقتباس مزدوجة** حول أسماء الأعمدة والجداول (`"Hospital"`, `"heroTagline"`). بدونها Postgres يحوّلها لحروف صغيرة والأمر يفشل.
- النوع في SQL هو `JSONB` (وليس `Json` — تلك صيغة Prisma فقط).

**✅ التحقّق:** الملف موجود، وأمر `cat` يطبع 6 أسطر `ALTER TABLE`:
```bash
cat apps/api/prisma/migrations/20260728120000_hospital_page_fields/migration.sql
```

---

## الخطوة 6 — ولّد Prisma Client محلياً

```bash
cd apps/api
npx prisma generate
```

**✅ التحقّق:** يطبع `Generated Prisma Client`. لا أخطاء.

---

## الخطوة 7 — أضف الحقول الستة إلى `CreateHospitalDto` ⚠️ **الخطوة الأهم في الخطة**

**الملف:** `apps/api/src/modules/hospitals/dto/create-hospital.dto.ts`

> بدون هذه الخطوة، الـ API سيحذف الحقول الستة بصمت وسيبقى كل شيء `null`. راجع «الفخّ الأخطر» في الجزء 0.

**استبدل الملف بالكامل بهذا المحتوى:**

```ts
import {
  IsString,
  IsOptional,
  Matches,
  ValidateNested,
  IsEnum,
  IsArray,
  IsObject,
  ArrayMaxSize,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BilingualDto } from '../../../common/dto/bilingual.dto';
import { ContentStatus } from '@prisma/client';

/** تعبير منتظم يقبل روابط تضمين خرائط جوجل الرسمية فقط */
const MAPS_EMBED = /^https:\/\/(www\.)?google\.com\/maps\/embed/;

export class CreateHospitalDto {
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'slug must be lowercase letters, numbers, and hyphens only' })
  slug: string;

  @ValidateNested()
  @Type(() => BilingualDto)
  name: BilingualDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualDto)
  shortDescription?: BilingualDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualDto)
  description?: BilingualDto;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  heroImage?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'brandColor must be a valid hex color' })
  brandColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Matches(MAPS_EMBED, {
    message: 'googleMapsUrl must be an official Google Maps embed URL (https://www.google.com/maps/embed...)',
  })
  googleMapsUrl?: string;

  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualDto)
  metaTitle?: BilingualDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualDto)
  metaDescription?: BilingualDto;

  @IsOptional()
  @IsObject()
  customFields?: Record<string, any>;

  // ─── حقول صفحة المستشفى الجديدة (6) ───

  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualDto)
  heroTagline?: BilingualDto;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  heroStats?: any[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  departments?: any[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  locations?: any[];

  @IsOptional()
  @IsObject()
  contactInfo?: Record<string, any>;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  journeySteps?: any[];
}
```

**ما تغيّر بالتحديد (لعلمك، لا تنفّذه منفصلاً — الملف أعلاه كامل):**
- أُضيف `customFields` (كان مفقوداً — bug قائم).
- أُضيف تحقّق صارم على `googleMapsUrl` (كان `@IsString()` فقط = ثغرة حقن iframe).
- أُضيفت الحقول الستة الجديدة.

**✅ التحقّق:**
```bash
cd apps/api && npx tsc --noEmit
```
لا أخطاء.

---

## الخطوة 8 — تحقّق من صحة الأقسام في الـ Service (منع تكرار `deptSlug`)

**الملف:** `apps/api/src/modules/hospitals/hospitals.service.ts`

### 8.أ — أضف دالة مساعدة داخل الكلاس

أضف هذه الدالة **بعد** سطر `constructor(private prisma: PrismaService) {}` (السطر 19):

```ts
  /**
   * يتحقّق من صحة مصفوفة الأقسام قبل الحفظ:
   * كل قسم يجب أن يكون له slug صالح، وكل slug فريد داخل نفس المستشفى.
   */
  private validateDepartments(departments: any): void {
    if (departments === undefined || departments === null) return;
    if (!Array.isArray(departments)) {
      throw new BadRequestException('departments must be an array');
    }
    const seen = new Set<string>();
    for (const [i, dept] of departments.entries()) {
      const slug = dept?.slug;
      if (typeof slug !== 'string' || !/^[a-z0-9-]+$/.test(slug)) {
        throw new BadRequestException(
          `القسم رقم ${i + 1}: الـ slug مطلوب ويجب أن يكون حروفاً إنجليزية صغيرة وأرقاماً وشرطات فقط`,
        );
      }
      if (seen.has(slug)) {
        throw new BadRequestException(`الـ slug "${slug}" مكرّر — يجب أن يكون كل قسم بـ slug فريد`);
      }
      seen.add(slug);
      if (!dept?.name?.ar) {
        throw new BadRequestException(`القسم "${slug}": الاسم بالعربية مطلوب`);
      }
    }
  }
```

`BadRequestException` مستورد بالفعل في أعلى الملف — **لا تضف import**.

### 8.ب — نادِ الدالة في `create`

في دالة `create` (السطر ~72)، أضف السطر المؤشَّر عليه:

```ts
  async create(dto: CreateHospitalDto) {
    const existing = await this.prisma.hospital.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('A hospital with this slug already exists');

    this.validateDepartments((dto as any).departments);   // ← أضف هذا السطر

    return this.prisma.hospital.create({ data: dto as any });
  }
```

### 8.ج — نادِ الدالة في `update`

في دالة `update` (السطر ~79)، أضف السطر المؤشَّر عليه:

```ts
  async update(id: string, dto: UpdateHospitalDto) {
    const existing = await this.prisma.hospital.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Hospital not found');

    this.validateDepartments((dto as any).departments);   // ← أضف هذا السطر

    const slugChanged = dto.slug && dto.slug !== existing.slug;
    // ... باقي الدالة كما هي، لا تلمسها
```

**✅ التحقّق:** `npx tsc --noEmit` بلا أخطاء.

---

## الخطوة 9 — وسّع `findBySlug` ليُرجع العيادات والأخبار

**الملف:** `apps/api/src/modules/hospitals/hospitals.service.ts`

**استبدل دالة `findBySlug` بالكامل** (السطور 58-70) بهذا:

```ts
  async findBySlug(slug: string) {
    const hospital = await this.prisma.hospital.findUnique({
      where: { slug },
      include: {
        // المراكز الطبية التابعة + عيادات كل مركز (للسيكشن 2 و 4)
        medicalCenters: {
          include: {
            medicalCenter: {
              select: {
                id: true,
                slug: true,
                name: true,
                heroImage: true,
                isFeatured: true,
                clinics: {
                  select: { id: true, name: true, schedule: true },
                  orderBy: { createdAt: 'asc' },
                },
              },
            },
          },
        },
        // الأطباء (لصفحة القسم)
        doctors: {
          include: {
            doctor: {
              select: { id: true, slug: true, name: true, specialty: true, photo: true, isFeatured: true },
            },
          },
        },
        // أحدث 4 أخبار مرتبطة بهذا المستشفى (للسيكشن 6)
        // ⚠️ اسم الحقل relatedHospitalId — وليس hospitalId
        newsPosts: {
          where: { status: 'PUBLISHED' },
          select: {
            id: true,
            slug: true,
            title: true,
            excerpt: true,
            featuredImage: true,
            publishedAt: true,
          },
          orderBy: { publishedAt: 'desc' },
          take: 4,
        },
      },
    });
    if (!hospital || hospital.status !== 'PUBLISHED') {
      throw new NotFoundException('Hospital not found');
    }
    return hospital;
  }
```

> **ملاحظة:** علاقة `newsPosts` معرَّفة على `Hospital` بالفعل (`schema.prisma:199`) عبر المفتاح `relatedHospitalId`. لا تحتاج تغيير schema لهذا.

**✅ التحقّق:** `npx tsc --noEmit` بلا أخطاء. **لو ظهر خطأ يقول أن `clinics` أو `newsPosts` غير موجودة — أنت لم تشغّل `npx prisma generate` (الخطوة 6). ارجع ونفّذها.**

---

## الخطوة 10 — طبّق الـ migration على قاعدة البيانات

> ⛔ الأمر الوحيد المسموح: `prisma migrate deploy`

على السيرفر:

```bash
cd ~/INSAN-Healthcare-Platform/website
docker exec insan-api npx prisma migrate deploy
```

**✅ التحقّق (فحصان، كلاهما إلزامي):**

**فحص 1 — الـ migration مُسجَّل:**
```bash
docker exec insan-api npx prisma migrate status
```
يجب أن يظهر `20260728120000_hospital_page_fields` كـ **applied**.

**فحص 2 — الأعمدة موجودة فعلاً:**
```bash
docker exec insan-api npx prisma db execute --stdin <<'SQL'
SELECT column_name FROM information_schema.columns
WHERE table_name = 'Hospital'
  AND column_name IN ('heroTagline','heroStats','departments','locations','contactInfo','journeySteps');
SQL
```
يجب أن يُرجع **6 صفوف**. لو أقل → توقّف وأبلِغ.

**🛑 نقطة توقّف:** لا تكمل للمرحلة ج قبل نجاح الفحصين.

---

# 🖥️ المرحلة ج — لوحة الأدمن

## الخطوة 11 — صحّح أنواع `Hospital` في الفرونت

**الملف:** `apps/web/lib/public-api.ts`

**استبدل `interface Hospital`** (السطور 41-49) بهذا:

```ts
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
```

**لا تعدّل أي interface آخر في الملف.**

**✅ التحقّق:**
```bash
cd apps/web && npx tsc --noEmit
```
> قد تظهر أخطاء في ملفات أخرى **موجودة أصلاً قبل تغييرك** — تجاهلها. المطلوب: لا يوجد خطأ في `public-api.ts` نفسه.

---

## الخطوة 12 — أعد بناء `HospitalModal.tsx` بالكامل

> **⚠️ اقرأ هذا قبل التنفيذ:** الفورم الحالي **مكسور**. يرسل 6 حقول غير موجودة في الـ API (`city`, `address`, `phone`, `email`, `website`, `brandId`) تُحذف بصمت، و**لا يرسل `slug`** الإلزامي — أي أن **إضافة مستشفى جديد ترجع خطأ 400 دائماً**. لا تبنِ تبويبات فوق فورم مكسور. أعد بناءه.

### الحقول المطلوبة في الفورم الجديد — خمسة تبويبات

| التبويب | الحقول |
|---------|--------|
| **الأساسية** | `slug` (نص، إلزامي) · `name` (ثنائي، إلزامي) · `shortDescription` (ثنائي) · `description` (ثنائي) · `logoUrl` (نص) · `heroImage` (نص) · `brandColor` (نص hex) · `status` (قائمة: DRAFT/PUBLISHED/ARCHIVED) |
| **Hero** | `heroTagline` (ثنائي) · `heroStats` — 3 صفوف ثابتة، كل صف: `value` + `suffix` + `label.ar` + `label.en` |
| **الأقسام** | `departments` — قائمة قابلة للإضافة/الحذف. كل عنصر: `slug` + `name` (ثنائي) + `shortDescription` (ثنائي) + `description` (ثنائي) + `image` + `doctorIds` (اختيار متعدد من قائمة الأطباء) |
| **رحلة المريض** | `journeySteps` — 4 صفوف ثابتة، كل صف: `icon` (قائمة منسدلة بالقيم الثمانية) + `title` (ثنائي) + `desc` (ثنائي) |
| **التواصل والمواقع** | `contactInfo.phone` · `contactInfo.email` · `contactInfo.address` (ثنائي) · `googleMapsUrl` · `locations` — قائمة قابلة للإضافة/الحذف، كل عنصر: `name` (ثنائي) + `mapsUrl` |

### قواعد تنفيذ إلزامية

1. **احذف نهائياً** الحقول: `city`, `address`, `phone`, `email`, `website`, `brandId` من الفورم، واحذف استعلام `useQuery(['brands-list'])` معها. هذه الحقول لا وجود لها في قاعدة البيانات وحفظها وهمي.
2. **أضف حقل `slug`** في تبويب «الأساسية»، إلزامي، مع تلميح: «حروف إنجليزية صغيرة وأرقام وشرطات فقط».
   - عند **الإضافة**: الحقل قابل للكتابة.
   - عند **التعديل**: اعرضه قابلاً للكتابة أيضاً (الـ API يتعامل مع تغيير الـ slug وينشئ redirect تلقائياً).
3. **حقل `googleMapsUrl` وكل حقول `mapsUrl`**: أضف تلميحاً تحت الحقل: «يجب أن يبدأ بـ `https://www.google.com/maps/embed`». الـ API سيرفض غير ذلك بخطأ 400.
4. **لا تُرسل حقلاً فارغاً كنص فارغ.** قبل الإرسال، احذف كل مفتاح قيمته `''` أو `undefined` أو مصفوفة فارغة. مثال:
   ```ts
   function clean(obj: any) {
     const out: any = {};
     for (const [k, v] of Object.entries(obj)) {
       if (v === '' || v === undefined || v === null) continue;
       if (Array.isArray(v) && v.length === 0) continue;
       out[k] = v;
     }
     return out;
   }
   // ثم: mut.mutate(clean(formData))
   ```
   **السبب:** `brandColor: ''` سيفشل تحقّق الـ hex ويرجع 400.
5. استخدم المكوّنات الموجودة فقط: `Modal`, `FormField`, `BilingualInput`, و `inputCls`/`textareaCls`/`selectCls` من `@/components/admin/ui/FormField`. **لا تنشئ مكوّنات UI جديدة ولا تضف مكتبات.**
6. للتبويبات: استخدم `useState<string>('basic')` وأزرار عادية. **لا تضف مكتبة tabs.**
7. لقائمة الأطباء في تبويب «الأقسام»: `useQuery({ queryKey: ['doctors-list'], queryFn: () => api.doctors.list({ pageSize: 200 }) })`.
8. **أضف تنبيهاً في أعلى المودال** بنص: «التغييرات على الموقع العام تظهر خلال دقيقة واحدة» — لأن الصفحات تستخدم ISR بمدة 60 ثانية.

**✅ التحقّق (يدوي، 4 فحوص — كلها إلزامية):**

| # | الإجراء | النتيجة المطلوبة |
|---|---------|------------------|
| 1 | أضف مستشفى جديد بـ slug `test-hospital-tmp` واسم عربي | ينجح ويظهر في القائمة (لا خطأ 400) |
| 2 | عدّل مستشفى موجود: املأ تبويب Hero بالكامل واحفظ | رسالة نجاح |
| 3 | أعد فتح نفس المستشفى للتعديل | **قيم Hero التي كتبتها ظاهرة** ← هذا يثبت أن الحفظ حقيقي |
| 4 | من الـ terminal: `curl -s "http://<host>/api/v1/hospitals/<slug>" \| grep heroTagline` | يظهر النص الذي كتبته |

> **الفحص 3 و 4 هما الأهم.** لو ظهرت رسالة نجاح لكن القيم فارغة عند إعادة الفتح → **الحقل مفقود من الـ DTO (الخطوة 7). ارجع وتحقّق. لا تكمل.**

بعد النجاح: احذف `test-hospital-tmp`.

**🛑 نقطة توقّف:** لا تكمل للمرحلة د قبل أن ينجح الفحص 4.

---

# 🎨 المرحلة د — مكوّنات الواجهة العامة (7 مكوّنات)

## قواعد عامة لكل مكوّنات هذه المرحلة

1. **المسار:** كل الملفات في `apps/web/components/public/`.
2. **أول سطر في كل ملف:** `'use client';`
3. **لكل مكوّن `interface Props`** — يستقبل بيانات جاهزة، لا يجلب شيئاً بنفسه.
4. **طريقة العمل مع كل مكوّن — بالحرف:**
   - أ) اقرأ ملف المرجع البصري كاملاً.
   - ب) انسخ بنية الـ JSX والـ `className` **حرفياً**.
   - ج) استبدل النصوص المكتوبة يدوياً بقيم من الـ props.
   - د) **لا تغيّر أي `className`.** لا تغيّر ألواناً، ولا مسافات، ولا أحجام خطوط. التصميم الحالي مقصود.
5. **استخدم `t()` من `@/lib/utils`** لكل حقل ثنائي اللغة: `{t(dept.name)}` وليس `{dept.name}`.
   > **السبب:** الحقول الثنائية كائنات `{ar, en}`. كتابة `{obj}` داخل JSX تُنتج انهيار React: `Objects are not valid as a React child`.
6. **كل مكوّن يجب أن يُرجع `null` لو بياناته فارغة:**
   ```ts
   if (!items || items.length === 0) return null;
   ```
   **السبب:** كل المستشفيات الحالية قيمها `null`. بدون هذا الفحص ستظهر سيكشنات فارغة أو تنهار الصفحة.

---

## الخطوة 13 — `HospitalHeroSection.tsx`

**المرجع:** `components/public/HeroSection.tsx`

```ts
interface Props {
  name: any;            // Bilingual
  tagline?: any;        // Bilingual
  stats?: { value: string; suffix?: string; label: any }[];
  heroImage?: string;
  hospitalId: string;
}
```

**التعديلات على المرجع:**
- `<h1>` → `{t(name)}` (احذف الـ `<span>` الملوّن).
- `<p className="hero-description">` → `{t(tagline)}`. لو `tagline` غير موجود، لا تعرض الـ `<p>`.
- بلوك `.hero-stats`: اعرض `stats.map(...)`. استخدم `<CountUp end={Number(stat.value) || 0} duration={2} />` ثم `{stat.suffix}` ثم `{t(stat.label)}`. لو `stats` غير موجودة أو فارغة، لا تعرض البلوك.
- الصورة: `src={heroImage}`. **لو `heroImage` غير موجود، لا تعرض العمود الأيمن إطلاقاً** (لا تستخدم صورة Unsplash افتراضية).
- **احذف** بلوك `trust-badges` (الثلاث شارات) و`floating-card` (كارت الموعد وكارت التقييم) — هذه بيانات وهمية خاصة بالصفحة الرئيسية.
- زر «احجز موعدك» → `href={`/book?hospitalId=${hospitalId}`}`. **احذف** زر «ابحث عن طبيبك».

**✅ التحقّق:** `npx tsc --noEmit` — لا خطأ في هذا الملف.

---

## الخطوة 14 — `HospitalClinicsSection.tsx`

**جديد كلياً — لا يوجد مرجع.**

```ts
interface Props {
  clinics: {
    id: string;
    name: any;              // Bilingual
    schedule: any;          // Json حرّ الشكل
    centerId: string;
    centerName: any;        // Bilingual
  }[];
  hospitalId: string;
}
```

**التنفيذ:**
- `if (!clinics || clinics.length === 0) return null;`
- `<section className="py-20 bg-light-bg">` ثم `<div className="container mx-auto px-4 md:px-8 max-w-7xl">`
- `<SectionTitle title="العيادات الخارجية التابعة للمستشفى" subtitle="اختر العيادة المناسبة واحجز موعدك" />`
- Grid: `className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12"`
- كل كارت: `className="bg-white rounded-card p-6 border border-gray-100 shadow-sm hover:shadow-card-hover transition-all"` ويحتوي:
  1. اسم العيادة: `<h4 className="text-lg font-bold text-heading font-montserrat mb-2">{t(clinic.name)}</h4>`
  2. اسم المركز الطبي الأب: `<p className="text-sm text-gray-500 font-cairo mb-4">{t(clinic.centerName)}</p>`
     > ⚠️ **موديل `Clinic` لا يحتوي على حقل «تخصص».** لا تحاول قراءة `clinic.specialty` — غير موجود. اسم المركز الأب هو البديل المعتمد.
  3. مواعيد الدوام: اعرض `clinic.schedule`. شكله **غير مضمون** (Json حرّ) — لذلك:
     ```tsx
     {clinic.schedule && (
       <div className="text-sm text-default font-cairo space-y-1 mb-5">
         {typeof clinic.schedule === 'string'
           ? <p>{clinic.schedule}</p>
           : Array.isArray(clinic.schedule)
             ? clinic.schedule.map((s: any, i: number) => <p key={i}>{typeof s === 'string' ? s : JSON.stringify(s)}</p>)
             : Object.entries(clinic.schedule).map(([k, v]) => (
                 <p key={k}><span className="font-semibold">{k}:</span> {String(v)}</p>
               ))}
       </div>
     )}
     ```
     **لا تختصر هذا الفحص.** `JSON.stringify` هو الملاذ الأخير المتعمّد كي لا تنهار الصفحة على شكل بيانات غير متوقّع.
  4. زر الحجز:
     ```tsx
     <Link
       href={`/book?medicalCenterId=${clinic.centerId}&hospitalId=${hospitalId}`}
       className="block text-center w-full bg-accent-500 hover:bg-accent-600 text-white font-bold py-3 rounded-pill transition-all font-cairo"
     >
       احجز موعد
     </Link>
     ```
     > ⚠️ **لا تستخدم `?hospitalId=` وحده.** أسئلة الحجز الديناميكية (`BookingQuestion`) مرتبطة بالمركز الطبي لا بالمستشفى — `AppointmentForm` يجلب الأسئلة عند وجود `medicalCenterId` فقط. بدون `medicalCenterId` لن يرى المريض أسئلة المركز أبداً.

**✅ التحقّق:** `npx tsc --noEmit` — لا خطأ في هذا الملف.

---

## الخطوة 15 — `HospitalDepartmentsSection.tsx`

**المرجع:** `components/public/HospitalsSection.tsx` (اقرأه أولاً)

```ts
interface Props {
  hospitalSlug: string;
  departments: {
    slug: string;
    name: any;
    shortDescription?: any;
    image?: string;
  }[];
}
```

**التنفيذ:**
- `if (!departments || departments.length === 0) return null;`
- نفس بنية grid المرجع.
- كل كارت: صورة (`dept.image`) + `{t(dept.name)}` + `{t(dept.shortDescription)}` + زر «اكتشف القسم».
- الرابط: `href={`/hospitals/${hospitalSlug}/departments/${dept.slug}`}`
- عنوان السيكشن: `"أقسام المستشفى المتاحة"`
- لو `dept.image` غير موجود: اعرض مكاناً بديلاً بلون خلفية (`bg-light-bg`) وأول حرف من اسم القسم. **لا تستخدم صورة خارجية.**

**✅ التحقّق:** `npx tsc --noEmit`.

---

## الخطوة 16 — `HospitalMedicalCentersSection.tsx`

**المرجع:** `components/public/FeaturedServicesSection.tsx` (اقرأه أولاً)

```ts
interface Props {
  hospitalName: any;
  hospitalImage?: string;
  centers: { id: string; slug: string; name: any; heroImage?: string }[];
}
```

**التنفيذ:**
- `if (!centers || centers.length === 0) return null;`
- **قرار محسوم — لا تناقشه ولا تغيّره:** الصورة الكبيرة على **اليسار** والكاردات على **اليمين** — **بالضبط كما في المرجع، بلا أي عكس.**
- الصورة الكبيرة = `hospitalImage`. لو غير موجودة، اعرض الكاردات فقط بعرض كامل.
- كل كارت مركز يربط إلى `/medical-centers/${center.slug}`.
- عنوان السيكشن: `"المراكز الطبية التابعة"`

**✅ التحقّق:** `npx tsc --noEmit`.

---

## الخطوة 17 — `HospitalJourneySection.tsx`

**المرجع:** `components/public/PatientJourneySection.tsx`

```ts
interface Props {
  steps?: { icon: string; title: any; desc: any }[];
}
```

**التنفيذ:**
- استورد الأيقونات الثمانية وابنِ خريطة تحويل:
  ```ts
  import { Search, Calendar, Stethoscope, Smile, Heart, Shield, Users, Activity } from 'lucide-react';

  const ICONS: Record<string, any> = {
    search: Search, calendar: Calendar, stethoscope: Stethoscope, smile: Smile,
    heart: Heart, shield: Shield, users: Users, activity: Activity,
  };
  ```
  > **السبب:** هذا مكوّن `'use client'` تستدعيه صفحة سيرفر. **لا يمكن تمرير عناصر JSX أو دوال عبر حدّ السيرفر/العميل.** لذلك الأدمن يخزّن **اسم** الأيقونة كنص، والتحويل يحدث هنا داخل العميل.
- الرسم: `const Icon = ICONS[step.icon] ?? Search;` ثم `<Icon className="w-8 h-8" />`
  > `?? Search` احتياط إلزامي: لو خزّن الأدمن اسماً غير موجود، بدونه سينهار المكوّن بـ `Element type is invalid`.
- **قيمة افتراضية عند غياب البيانات:** لو `steps` غير موجودة أو فارغة، **اعرض نفس الخطوات الأربعة المكتوبة في المرجع حرفياً** (انسخ مصفوفة `steps` من `PatientJourneySection.tsx:8-33`). **لا تُرجع `null` في هذا المكوّن** — الخطة تنصّ على الخطوات الافتراضية.
- عنوان السيكشن: `"رحلة المريض معنا"` (كما في المرجع).

**✅ التحقّق:** `npx tsc --noEmit`.

---

## الخطوة 18 — `HospitalNewsSection.tsx`

**المرجع:** `components/public/LatestNewsSection.tsx` (اقرأه أولاً)

```ts
interface Props {
  posts: {
    id: string; slug: string; title: any; excerpt?: any;
    featuredImage?: string; publishedAt?: string;
  }[];
}
```

**التنفيذ:**
- `if (!posts || posts.length === 0) return null;`
- نفس بنية المرجع. الرابط `/news/${post.slug}`.
- استخدم `formatDate(post.publishedAt)` من `@/lib/utils` للتاريخ.
- عنوان السيكشن: `"أحدث الأخبار"`

> **ملاحظة:** منطق «لو لا توجد أخبار خاصة، اعرض الأخبار العامة» **يُنفَّذ في الصفحة (الخطوة 20)، لا هنا.** هذا المكوّن يعرض ما يُعطى له فقط.

**✅ التحقّق:** `npx tsc --noEmit`.

---

## الخطوة 19 — `HospitalContactSection.tsx`

**المرجع:** `components/public/HomeContactSection.tsx` (اقرأه أولاً)

```ts
interface Props {
  hospitalId: string;
  contactInfo?: { phone?: string; email?: string; address?: any };
  locations?: { name: any; mapsUrl: string }[];
  fallbackMapUrl?: string;   // googleMapsUrl للمستشفى
}
```

**التنفيذ:**

**العمود الأيسر** (خلفية Navy داكنة — نفس `className` المرجع):
- تليفون: `<a href={`tel:${contactInfo.phone}`}>` — اعرضه فقط إن وُجد.
- إيميل: `<a href={`mailto:${contactInfo.email}`}>` — اعرضه فقط إن وُجد.
- عنوان: `{t(contactInfo.address)}` — اعرضه فقط إن وُجد.
- زر «احجز موعداً» → `/book?hospitalId=${hospitalId}`

**العمود الأيمن** — تبويبات المواقع:
- ابنِ قائمة المواقع النهائية بهذا المنطق **بالحرف**:
  ```ts
  const tabs = (locations && locations.length > 0)
    ? locations
    : (fallbackMapUrl ? [{ name: { ar: 'الموقع', en: 'Location' }, mapsUrl: fallbackMapUrl }] : []);
  ```
- `if (tabs.length === 0)` → لا تعرض العمود الأيمن إطلاقاً (اجعل الأيسر بعرض كامل).
- `const [active, setActive] = useState(0);`
- أزرار التبويب: صفّ أزرار، الزر النشط بـ `bg-accent-500 text-white`، غير النشط `bg-white text-heading border border-gray-200`. لو كان هناك موقع واحد فقط، **لا تعرض صفّ الأزرار**.
- **حماية إلزامية على الـ iframe:**
  ```tsx
  {(() => {
    const url = tabs[active]?.mapsUrl || '';
    if (!/^https:\/\/(www\.)?google\.com\/maps\/embed/.test(url)) return null;
    return (
      <iframe
        src={url}
        width="100%" height="100%"
        style={{ border: 0 }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        sandbox="allow-scripts allow-same-origin allow-popups"
        title={t(tabs[active].name)}
      />
    );
  })()}
  ```
  > **لا تحذف فحص الـ regex ولا خاصية `sandbox`.** رابط الخريطة يأتي من قاعدة البيانات، وبدون الفحص يصبح ثقب حقن (`javascript:` / `data:`) في صفحة عامة.
- ضع الـ iframe داخل: `<div className="w-full h-[400px] rounded-2xl overflow-hidden border border-gray-200 shadow-sm">`

**✅ التحقّق:** `npx tsc --noEmit`.

---

# 📄 المرحلة هـ — الصفحات

## الخطوة 20 — أعد كتابة صفحة المستشفى

**الملف:** `apps/web/app/hospitals/[slug]/page.tsx`

**احتفظ كما هو، بلا أي تعديل:**
- كل الـ imports الموجودة
- دالة `generateMetadata` بالكامل
- `const res = await getHospital(params.slug); if (!res?.data) notFound();`

**استبدل محتوى `return (...)` بالكامل** بهذا التركيب:

```tsx
export default async function HospitalDetailPage({ params }: Props) {
  const res = await getHospital(params.slug);
  if (!res?.data) notFound();
  const h = res.data;

  // ─── تجهيز بيانات السيكشن 2: تجميع عيادات كل المراكز التابعة ───
  const clinics = (h.medicalCenters ?? []).flatMap((link: any) =>
    (link.medicalCenter?.clinics ?? []).map((c: any) => ({
      id: c.id,
      name: c.name,
      schedule: c.schedule,
      centerId: link.medicalCenter.id,
      centerName: link.medicalCenter.name,
    })),
  );

  // ─── تجهيز بيانات السيكشن 4 ───
  const centers = (h.medicalCenters ?? []).map((link: any) => link.medicalCenter).filter(Boolean);

  // ─── تجهيز بيانات السيكشن 6: أخبار المستشفى، وإلا أخبار عامة ───
  let posts = h.newsPosts ?? [];
  if (posts.length === 0) {
    const general = await getNewsPosts({ pageSize: 4 });
    posts = (general?.data ?? []) as any[];
  }

  return (
    <PublicLayout>
      <PageTitle
        title={t(h.name)}
        breadcrumbs={[
          { label: 'المستشفيات', href: '/hospitals' },
          { label: t(h.name) },
        ]}
      />

      {/* 1 */}
      <HospitalHeroSection
        name={h.name}
        tagline={h.heroTagline}
        stats={h.heroStats}
        heroImage={h.heroImage}
        hospitalId={h.id}
      />

      {/* 2 */}
      <HospitalClinicsSection clinics={clinics} hospitalId={h.id} />

      {/* 3 */}
      <HospitalDepartmentsSection hospitalSlug={h.slug} departments={h.departments ?? []} />

      {/* 4 */}
      <HospitalMedicalCentersSection
        hospitalName={h.name}
        hospitalImage={h.heroImage}
        centers={centers}
      />

      {/* 5 */}
      <HospitalJourneySection steps={h.journeySteps} />

      {/* 6 */}
      <HospitalNewsSection posts={posts} />

      {/* 7 */}
      <HospitalContactSection
        hospitalId={h.id}
        contactInfo={h.contactInfo}
        locations={h.locations}
        fallbackMapUrl={h.googleMapsUrl}
      />
    </PublicLayout>
  );
}
```

**أضف هذه الـ imports** إلى أعلى الملف:
```tsx
import { getHospital, getNewsPosts } from '@/lib/public-api';
import HospitalHeroSection from '@/components/public/HospitalHeroSection';
import HospitalClinicsSection from '@/components/public/HospitalClinicsSection';
import HospitalDepartmentsSection from '@/components/public/HospitalDepartmentsSection';
import HospitalMedicalCentersSection from '@/components/public/HospitalMedicalCentersSection';
import HospitalJourneySection from '@/components/public/HospitalJourneySection';
import HospitalNewsSection from '@/components/public/HospitalNewsSection';
import HospitalContactSection from '@/components/public/HospitalContactSection';
```

**احذف** الـ imports التي لم تبقَ مستخدمة: `Link`, و`Calendar, Phone, Activity, Users` من `lucide-react`.
**تحذير:** لا تحذف `PublicLayout`, `PageTitle`, `t`, `notFound`, `Metadata` — كلها لا تزال مستخدمة.

**✅ التحقّق:**
```bash
cd apps/web && npx next build
```
يجب أن ينجح البناء. ثم شغّل التطوير وافتح `/hospitals/delta-hospital`:
- الصفحة تُحمَّل بلا أخطاء في الـ console.
- السيكشنات التي بياناتها `null` **مخفية تماماً** (لا مربّعات فارغة).
- سيكشن «رحلة المريض» يظهر بالخطوات الافتراضية.

---

## الخطوة 21 — أنشئ صفحة القسم المستقلة

**الملف الجديد:** `apps/web/app/hospitals/[slug]/departments/[deptSlug]/page.tsx`

```tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PublicLayout from '@/components/public/PublicLayout';
import PageTitle from '@/components/public/PageTitle';
import DoctorCard from '@/components/public/DoctorCard';
import { getHospital } from '@/lib/public-api';
import { t } from '@/lib/utils';

interface Props { params: { slug: string; deptSlug: string } }

/** يبحث عن القسم داخل مصفوفة departments بالـ slug */
function findDept(hospital: any, deptSlug: string) {
  const list = Array.isArray(hospital?.departments) ? hospital.departments : [];
  return list.find((d: any) => d?.slug === deptSlug) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const res = await getHospital(params.slug);
  const dept = findDept(res?.data, params.deptSlug);
  if (!dept) return { title: 'قسم | منظومة إنسان' };
  return {
    title: `${t(dept.name)} | ${t(res!.data.name)}`,
    description: t(dept.shortDescription) || t(dept.description),
  };
}

export default async function DepartmentPage({ params }: Props) {
  const res = await getHospital(params.slug);
  if (!res?.data) notFound();

  const dept = findDept(res.data, params.deptSlug);
  if (!dept) notFound();          // ← إلزامي: القسم غير موجود = 404 وليس صفحة فارغة

  // أطباء هذا القسم = الأطباء الذين اختارهم الأدمن في doctorIds
  const ids: string[] = Array.isArray(dept.doctorIds) ? dept.doctorIds : [];
  const doctors = (res.data.doctors ?? [])
    .map((link: any) => link.doctor)
    .filter((d: any) => d && ids.includes(d.id));

  return (
    <PublicLayout>
      <PageTitle
        title={t(dept.name)}
        breadcrumbs={[
          { label: 'المستشفيات', href: '/hospitals' },
          { label: t(res.data.name), href: `/hospitals/${params.slug}` },
          { label: t(dept.name) },
        ]}
      />

      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 md:px-8 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-heading font-montserrat mb-6">{t(dept.name)}</h2>
              {dept.description && (
                <div className="prose max-w-none font-cairo text-default leading-relaxed">
                  <p>{t(dept.description)}</p>
                </div>
              )}
            </div>
            {dept.image && (
              <div className="rounded-card overflow-hidden shadow-floating aspect-video">
                <img src={dept.image} alt={t(dept.name)} className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        </div>
      </section>

      {doctors.length > 0 && (
        <section className="py-16 bg-light-bg">
          <div className="container mx-auto px-4 md:px-8 max-w-7xl">
            <h3 className="text-2xl font-bold text-heading font-montserrat mb-10 text-center">
              أطباء القسم
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {doctors.map((d: any) => <DoctorCard key={d.id} doctor={d} />)}
            </div>
          </div>
        </section>
      )}
    </PublicLayout>
  );
}
```

> **قبل التنفيذ:** اقرأ `components/public/DoctorCard.tsx` وتأكّد من اسم الـ prop الذي يقبله. لو لم يكن `doctor`، صحّح الاستدعاء ليطابق الموجود فعلاً. **لا تعدّل `DoctorCard.tsx` نفسه.**

**✅ التحقّق:**
- `npx next build` ينجح.
- من الأدمن أضف قسماً بـ slug `test-dept` لمستشفى، ثم افتح `/hospitals/<slug>/departments/test-dept` → القسم يظهر.
- افتح `/hospitals/<slug>/departments/does-not-exist` → **صفحة 404** (وليس صفحة فارغة أو انهيار).

---

# ✅ المرحلة و — القبول النهائي

## الخطوة 22 — قائمة الفحص النهائية

نفّذ كل بند وسجّل ✅ أو ❌. **لا تنشر إلا إذا كانت كل البنود ✅.**

| # | الفحص | كيف |
|---|-------|-----|
| 1 | البناء ينجح | `cd apps/api && npx tsc --noEmit` + `cd apps/web && npx next build` |
| 2 | الأعمدة الستة في الـ DB | استعلام `information_schema` من الخطوة 10 → 6 صفوف |
| 3 | الحقول تُحفَظ فعلاً | عدّل من الأدمن ثم `curl .../api/v1/hospitals/<slug>` → القيم ظاهرة |
| 4 | إضافة مستشفى جديد تعمل | من الأدمن، بـ slug جديد → لا خطأ 400 |
| 5 | مستشفى ببيانات كاملة | 7 سيكشنات ظاهرة وصحيحة بصرياً |
| 6 | مستشفى ببيانات فارغة (`null`) | لا انهيار، لا مربّعات فارغة، رحلة المريض بالافتراضي |
| 7 | صفحة قسم موجود | تعمل |
| 8 | صفحة قسم غير موجود | 404 |
| 9 | زر الحجز من كارت عيادة | يفتح `/book` وتظهر **أسئلة المركز الطبي** |
| 10 | خريطة برابط غير صالح | لا تُعرَض (لا iframe فارغ ولا خطأ) |
| 11 | تكرار slug قسم | الأدمن يرجع خطأ 400 برسالة عربية واضحة |
| 12 | الجوال (375px) | كل السيكشنات تُقرأ، لا تمرير أفقي |
| 13 | RTL | الاتجاه صحيح في كل السيكشنات |
| 14 | console المتصفح | **صفر أخطاء** على صفحة المستشفى وصفحة القسم |

---

## الخطوة 23 — النشر

**لا تنشر قبل أن تكون كل بنود الخطوة 22 ✅.**

```bash
git add -A
git commit -m "feat(hospitals): redesign hospital detail page with 7 sections + department pages"
git push -u origin feature/hospital-pages-redesign
```

ثم **أبلِغ الإنسان وتوقّف.** النشر على الإنتاج قرار الإنسان لا قرارك.

عندما يوافق، النشر يتم بـ:
```bash
./deploy.ps1
```
> **تحذير:** `deploy.ps1:43` يشغّل الـ seed تلقائياً بعد كل نشر. تأكّد من الإنسان أن هذا مقبول قبل التشغيل.

---

# 🔄 خطة التراجع (Rollback)

لو ظهر خطأ بعد النشر:

**تراجع الكود** (آمن ولا يمسّ البيانات):
```bash
git checkout main
./deploy.ps1
```

**تراجع قاعدة البيانات:** الأعمدة الستة كلها `NULL`-able ولا يعتمد عليها أي كود قديم — لذلك **لا تحتاج التراجع عنها**، ويمكن تركها بأمان.

**استعادة كاملة** (فقط لو حدث فقدان بيانات):
```bash
psql "$DATABASE_URL" < ~/backups/insan-<التاريخ>.sql
```

---

# 📌 أمور خارج نطاق هذه الخطة — لا تلمسها

هذه مشاكل حقيقية موثّقة في [`CODE_REVIEW_2026-07-28.md`](./CODE_REVIEW_2026-07-28.md)، لكنها **ليست جزءاً من هذه المهمة**. لا تصلحها في هذا الفرع.

| الموضوع | الرقم في المراجعة |
|---------|-------------------|
| بيانات قاعدة البيانات المسرّبة في `test-db.js` | C-1 |
| ثقب IDOR في `PATCH /appointments/:id/answers` | C-2 |
| `PermissionsGuard` المفقود في `AiController` | C-3 |
| مفاتيح AI بالنص الصريح | C-4 |
| `POST /ai/chat` بلا تحقّق | C-5 |
| تفعيل HTTPS | M-1 |
| شات AI (دور `'ai'` الخاطئ) | H-4 |
| endpoint الأسئلة الشائعة المفقود | M-4 |
| حذف مجلد `apps/admin` الميّت | M-5 |
| تنظيف انحراف الـ migrations | H-1 |

**إن لاحظت أياً منها أثناء العمل: اذكره في تقريرك النهائي، ولا تصلحه.**
