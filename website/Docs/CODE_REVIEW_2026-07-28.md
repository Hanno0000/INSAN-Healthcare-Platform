# مراجعة الكود والأمان — منصة إنسان

**التاريخ:** 2026-07-28
**الـ commit المراجَع:** `3a72908` (feat(website): update hospital pages redesign, appointments, and booking flow)
**البيئة:** Ubuntu / Contabo VPS · Docker Compose (api + web + nginx) · Postgres مُدار (Supabase) · Next.js standalone + NestJS
**نطاق المراجعة:** كل ملفات `website/` — الـ API، الـ Web، الأدمن، Docker، nginx، سكربتات النشر، Prisma.
**تم التحقق منه لايف على:** `http://169.58.77.61` (طلبات قراءة فقط + طلب POST واحد غير ضار على `/ai/chat`).

> **ملاحظة:** لم أسجّل دخولاً بحساب الأدمن الذي أرسلته. كل ما هو مذكور هنا تم إثباته إمّا من قراءة الكود أو من طلبات عامة (غير مسجّلة الدخول). النقاط التي تحتاج جلسة أدمن مؤشّر عليها بـ «يحتاج تأكيد يدوي».

---

## ملخّص تنفيذي

| التصنيف | العدد | الحالة |
|---------|-------|--------|
| 🔴 حرج (Critical) | 5 | يجب إصلاحها **قبل** أي تطوير جديد |
| 🟠 عالي (High) | 6 | تعطّل الخطة الجديدة أو تُفقد بيانات |
| 🟡 متوسط (Medium) | 8 | تُصلَح ضمن الـ sprint |
| ⚪ منخفض (Low) | 5 | تنظيف |

**الخلاصة:** الكود **غير جاهز** لتنفيذ خطة إعادة تصميم صفحات المستشفيات كما هي. يوجد سرّ إنتاج مسرّب في الريبو، وثقب صلاحيات يسمح لأي مستخدم مسجّل بسحب مفاتيح API، وثقب IDOR يسمح لأي شخص بتعديل إجابات المرضى، **بالإضافة إلى انحراف (drift) بين `schema.prisma` وقاعدة البيانات الفعلية** — وهذا الانحراف تحديدًا سيؤدي إلى **مسح قاعدة البيانات** لو نفّذ المطوّر (أو الموديل) الخطوة رقم 2 من الخطة بالطريقة الافتراضية.

---

# 🔴 حرج — يجب الإصلاح فوراً

## C-1 · بيانات اتصال قاعدة بيانات الإنتاج مرفوعة على GitHub

**الملف:** `website/test-db.js`

```js
connectionString: 'postgresql://postgres.ijqprkbrqtfwizyxuzxl:TPArun%401950A@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
```

كلمة مرور قاعدة بيانات Supabase الحيّة (`TPArun@1950A`) مكتوبة بالنص الصريح داخل ملف في الريبو، وقد تم **push** لها بالفعل. أي شخص لديه وصول للريبو (أو أي تسريب مستقبلي، أو أي bot يفحص GitHub) يحصل على قراءة/كتابة كاملة على قاعدة بيانات المرضى.

**الخطورة:** بيانات صحية (مواعيد، أسماء، تليفونات، إجابات طبية) + مستخدمي الأدمن + hashes كلمات المرور.

**الإصلاح (بالترتيب، لا تختصر):**
1. **غيّر كلمة مرور قاعدة البيانات من لوحة Supabase الآن** — الملف موجود في تاريخ git، حذفه لا يكفي.
2. حدّث `DATABASE_URL` في `.env.production` على السيرفر وأعد تشغيل الحاويات.
3. احذف الملف: `git rm website/test-db.js`.
4. نظّف تاريخ git (`git filter-repo` أو BFG) وأعد الـ push بـ force، **أو** — إن كان الريبو خاصًّا وتقبل المخاطرة — اكتفِ بتغيير كلمة المرور واحذف الملف.
5. أضف قاعدة في `.gitignore`: `test-db.js` و `*.local.js`.
6. راجع باقي الريبو بحثًا عن أسرار أخرى قبل أي push.

---

## C-2 · أي شخص على الإنترنت يستطيع تعديل إجابات أي مريض (IDOR)

**الملف:** `apps/api/src/modules/leads/leads.controller.ts:40-45`

```ts
@Patch('appointments/:id/answers')          // ← لا يوجد @UseGuards
@HttpCode(HttpStatus.OK)
async updateAppointmentAnswers(@Param('id') id: string, @Body() body: { answers: any }) {
  const data = await this.leadsService.updateAppointmentAnswers(id, body.answers);
  return ApiResponse.success(data);          // ← يُرجع السجل كاملاً
}
```

ثلاث مشاكل مجتمعة:

1. **لا مصادقة ولا تحقّق ملكية.** أي معرّف موعد يعرفه المهاجم = صلاحية كتابة على السجل الطبي لذلك المريض.
2. **لا يوجد DTO.** `body: { answers: any }` نوع TypeScript فقط، وليس class-validator. الـ `ValidationPipe` العام (`whitelist: true`) **لا يعمل** على أنواع بدائية/interfaces — أي JSON مهما كان حجمه أو شكله يُكتب مباشرة في العمود. يمكن حشو ميجابايتات في العمود `answers`.
3. **يُرجع السجل كاملاً** بعد التعديل — أي اسم المريض وتليفونه وإيميله. أي شخص يخمّن/يحصل على `id` يقرأ بيانات المريض.

الـ IDs من نوع `cuid` (صعبة التخمين)، لكن هذا «أمان بالغموض» فقط — الـ ID يظهر في استجابة `POST /appointments` ويُخزَّن في الـ state، ويكفي تسرّبه مرة واحدة.

**الإصلاح:**
```ts
// leads.controller.ts
@Patch('appointments/:id/answers')
@Throttle({ default: { limit: 5, ttl: 60000 } })
@HttpCode(HttpStatus.OK)
async updateAppointmentAnswers(
  @Param('id') id: string,
  @Body() dto: UpdateAppointmentAnswersDto,   // DTO حقيقي بـ class-validator
) {
  await this.leadsService.updateAppointmentAnswers(id, dto.answers);
  return ApiResponse.success({ ok: true });   // لا تُرجع السجل
}
```
وفي الـ service: ارفض التعديل لو `status !== 'NEW'` أو لو `createdAt` أقدم من 15 دقيقة (نافذة إكمال النموذج فقط). أنشئ `UpdateAppointmentAnswersDto` بـ `@IsObject()` وحدّ أقصى للحجم.

---

## C-3 · `PermissionsGuard` مفقود في `AiController` — تعطيل كامل لفحص الصلاحيات

**الملف:** `apps/api/src/modules/ai/ai.controller.ts`

```ts
@UseGuards(JwtAuthGuard)                       // ← PermissionsGuard مفقود
@RequirePermission('settings', 'manage')       // ← ديكوريتور بلا حارس = بلا أثر
@Get('providers')
getProviders() { return this.aiService.getProviders(); }
```

`@RequirePermission` مجرد `SetMetadata`. الذي يقرأ الميتاداتا ويرفض هو `PermissionsGuard`. وهذا الحارس **غير مسجَّل عالميًا** — في `app.module.ts:57-62` الحارس العام الوحيد هو `ThrottlerGuard`.

**النتيجة:** كل الـ 6 endpoints في `AiController` محميّة بـ «مسجّل دخول» فقط، بلا أي فحص دور. مستخدم بدور `VIEWER` يستطيع قراءة وتعديل **وحذف** مزوّدي الذكاء الاصطناعي وقاعدة المعرفة.

للمقارنة، `IntegrationsController:8` يفعلها صح:
```ts
@UseGuards(JwtAuthGuard, PermissionsGuard)
```

**الإصلاح (سطر واحد، مكرّر 6 مرات):** استبدل `@UseGuards(JwtAuthGuard)` بـ `@UseGuards(JwtAuthGuard, PermissionsGuard)` — أو الأفضل: انقلها لمستوى الـ class.

**إصلاح وقائي مُوصى به بشدة:** سجّل `PermissionsGuard` كحارس عام في `app.module.ts` حتى لا يتكرر الخطأ في أي كنترولر مستقبلي:
```ts
{ provide: APP_GUARD, useClass: PermissionsGuard },
```
(آمن: الحارس يُرجع `true` فورًا إذا لم يوجد `@RequirePermission`.)

**يحتاج تأكيد يدوي:** أنشئ مستخدم `VIEWER` وجرّب `GET /api/v1/ai/providers` بتوكنه.

---

## C-4 · مفاتيح API لمزوّدي الذكاء الاصطناعي تُرجَع بالنص الصريح

**الملف:** `apps/api/src/modules/ai/ai.service.ts:14-18`

```ts
async getProviders() {
  return this.prisma.aiProvider.findMany({ orderBy: { priority: 'asc' } });
  //     ↑ بلا select — يُرجع apiKey كاملاً
}
```

و في `schema.prisma:519` العمود `apiKey String` مخزَّن **بالنص الصريح** بلا تشفير.

هذا يتناقض مع `IntegrationsService` الذي يشفّر بـ AES ويُرجع قيمة مُقنَّعة (`••••1234`). نفس المشروع، معياران مختلفان.

**بالتركيب مع C-3:** أي مستخدم مسجّل بأي دور = تسريب كل مفاتيح Groq/OpenAI/Gemini = فاتورة مفتوحة على حساب العميل.

**الإصلاح:**
1. فورًا: أضف `select` يستثني `apiKey`، وأرجع `maskedKey` بدلاً منه.
2. لاحقًا: شفّر `apiKey` باستخدام نفس `IntegrationsService.encrypt()` — أو الأفضل، احذف جدول `AiProvider` بالكامل واستخدم `IntegrationSetting` الموجود أصلاً والمشفَّر.

---

## C-5 · `POST /api/v1/ai/chat` — عام، بلا تحقّق، بلا سقف، وينهار

**الملفات:** `ai.controller.ts:61-64` · `ai.service.ts:105-107`

```ts
@Post('chat')                                   // ← بلا حارس (مقصود: عام)
processChat(@Body() body: { messages: {...}[] }) {   // ← بلا DTO
  return this.aiService.processChat(body.messages);
}
// ai.service.ts
const lastMessage = messages[messages.length - 1].content;   // ← ينهار لو messages فارغة/غير معرّفة
```

**تم إثباته لايف:**
```
POST http://169.58.77.61/api/v1/ai/chat   body: {}
→ HTTP 500  {"code":"INTERNAL_SERVER_ERROR"}
```

المشاكل:
- **انهيار (500)** على أي body لا يحتوي `messages` مصفوفة غير فارغة.
- **لا حدّ لعدد الرسائل ولا لطولها** — يمكن إرسال 10,000 رسالة بـ 1MB لكل واحدة، وكلها تُمرَّر مباشرة لمزوّد الـ LLM. استنزاف مالي مباشر.
- **حقن الأوامر (Prompt injection):** `messages` تُدفع كما هي، ويمكن للمهاجم إرسال `{"role":"system","content":"..."}` ليكتب فوق الـ system prompt.
- الحماية الوحيدة حاليًا هي `limit_req zone=api rate=10r/s` في nginx — وهي حماية ضد الفيضان، لا ضد التكلفة.

**الإصلاح:**
```ts
// ai/dto/chat.dto.ts
class ChatMessageDto {
  @IsIn(['user', 'assistant']) role: string;   // ← 'system' ممنوع من العميل
  @IsString() @MaxLength(2000) content: string;
}
export class ChatDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(20)
  @ValidateNested({ each: true }) @Type(() => ChatMessageDto)
  messages: ChatMessageDto[];
}

// ai.controller.ts
@Post('chat')
@Throttle({ default: { limit: 10, ttl: 60000 } })
processChat(@Body() dto: ChatDto) { return this.aiService.processChat(dto.messages); }
```

---

# 🟠 عالي — تُعطّل الخطة الجديدة أو تُفقد بيانات

## H-1 · انحراف بين `schema.prisma` وملفات الـ migrations ⚠️ **هذا يمسح قاعدة البيانات**

`schema.prisma` يحتوي **36 موديل**. ملفات الـ migrations تُنشئ **32 جدولاً فقط**.

**موديلات موجودة في الـ schema وغير موجودة في أي migration:**

| الموديل | موجود في الـ DB الحيّة؟ |
|---------|------------------------|
| `InvestorsPage` | ✅ نعم (أثبته `GET /api/v1/investors-page` → 200) |
| `BookingQuestion` | على الأرجح نعم |
| `AiProvider` | على الأرجح نعم |
| `FaqItem` | على الأرجح نعم |

**بالإضافة:** العمود `AiKnowledgeBase.embedding` من نوع `vector`، و `CREATE EXTENSION vector` — **غير موجودَين في أي ملف migration** (بحثت عن `vector` في كل مجلد `migrations` → صفر نتائج).

**التفسير:** شخص ما شغّل `prisma db push` على قاعدة الإنتاج بدل توليد migration. الجداول أُنشئت في الـ DB، لكن تاريخ الـ migrations لا يعرف عنها شيئًا.

**لماذا هذا خطير على الخطة تحديدًا:**

الخطوة 2 من الخطة تقول: «إنشاء migration». الأمر الافتراضي الذي سيكتبه أي مطوّر (أو موديل) هو:

```bash
npx prisma migrate dev --name add_hospital_fields
```

`migrate dev` يقوم بـ **drift detection**. سيجد أن الـ DB بها 4 جداول لا يعرفها، وسيطبع:

> `We need to reset the database` → **حذف كل بيانات الإنتاج.**

**القاعدة الملزِمة:**
- ❌ **ممنوع منعًا باتًّا** تشغيل `prisma migrate dev` أو `prisma migrate reset` على هذا المشروع.
- ✅ `prisma migrate deploy` **آمن** — لا يقوم بـ drift detection، فقط يطبّق الـ migrations المعلّقة.
- ✅ الطريقة الصحيحة: **اكتب ملف الـ migration بيدك** (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...`) وضعه في مجلد جديد، ثم `migrate deploy`.

**إصلاح منفصل (بعد الخطة):** ولّد migration تصحيحية لتوثيق الجداول الأربعة + امتداد `vector`، بصيغة `CREATE TABLE IF NOT EXISTS`، وسجّلها بـ `prisma migrate resolve --applied`.

---

## H-2 · `HospitalModal.tsx` مفصول تماماً عن الـ API — إضافة مستشفى **لا تعمل**

**الملف:** `apps/web/app/admin/hospitals/HospitalModal.tsx`

الفورم يرسل هذه الحقول:
```
name, description, city, address, phone, email, website, brandId, googleMapsUrl
```

الـ `CreateHospitalDto` يقبل هذه الحقول:
```
slug, name, shortDescription, description, logoUrl, heroImage,
brandColor, googleMapsUrl, status, metaTitle, metaDescription
```

**النتائج:**

1. **`city`, `address`, `phone`, `email`, `website`, `brandId` — غير موجودة لا في الـ DTO ولا في موديل `Hospital` في الـ schema.** الـ `ValidationPipe` العام مضبوط على `whitelist: true` (`main.ts:105`) → يحذفها بصمت. **المستخدم يضغط «حفظ»، تظهر رسالة «تم التحديث»، والبيانات لم تُحفظ إطلاقاً.**

2. **`slug` لا يُرسَل أبداً**، وهو `@IsString()` **إلزامي** في `CreateHospitalDto`. → **`POST /admin/hospitals` يرجع 400 دائماً. لا يمكن إضافة مستشفى جديد من لوحة الأدمن نهائياً.** (التعديل `PATCH` يعمل لأن `UpdateHospitalDto extends PartialType`.)

3. `shortDescription`, `logoUrl`, `heroImage`, `brandColor`, `status`, `metaTitle`, `metaDescription`, `customFields` — كلها في الـ schema والـ API لكن **لا توجد لها أي حقول في الفورم**. أي أن صورة الـ Hero التي تعتمد عليها الخطة (السيكشن 1) **لا يمكن رفعها من الأدمن اليوم**.

4. `customFields` موجود في الـ schema ويُعرض في الصفحة العامة، لكنه **غير موجود في الـ DTO** → لا يمكن ضبطه من الـ API أصلاً.

**التأثير على الخطة:** المرحلة 2 تقول «تحديث `HospitalModal.tsx` بإضافة تبويبات جديدة». البناء فوق أساس مكسور سينتج نفس العَرَض: تبويبات جميلة تحفظ لا شيء. **يجب إصلاح الفورم الأساسي أولاً.**

---

## H-3 · فخّ `whitelist: true` — أي حقل جديد لن يُحفَظ ما لم يُضَف للـ DTO

**الملف:** `apps/api/src/main.ts:103-110`

```ts
new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false, transform: true })
```

`whitelist: true` + `forbidNonWhitelisted: false` = **أخطر تركيبة ممكنة للتطوير**: أي خاصية غير معرَّفة بـ decorator في الـ DTO تُحذف **بصمت ودون أي خطأ**.

الخطة تذكر: «إضافة الحقول لـ `schema.prisma`» و «تحديث `hospitals.service.ts`» و «تحديث `public-api.ts`» — لكنها **لا تذكر `create-hospital.dto.ts` إطلاقاً**.

**النتيجة الحتمية لو نُفّذت الخطة كما هي:** الحقول الستة الجديدة (`heroTagline`, `heroStats`, `departments`, `locations`, `contactInfo`, `journeySteps`) ستُنشأ في قاعدة البيانات، وستُعرض في واجهة الأدمن، وسيضغط المستخدم «حفظ»، وستظهر رسالة نجاح — **وستبقى كل القيم `null` إلى الأبد.** وهذا أسوأ نوع من الأخطاء لأنه لا يترك أي أثر في الـ logs.

**الإصلاح الإلزامي:** كل حقل جديد **يجب** أن يُضاف لـ `CreateHospitalDto` مع decorator تحقّق مناسب. (مشروح خطوة بخطوة في ملف الخطة.)

**توصية إضافية:** غيّر `forbidNonWhitelisted` إلى `true` في بيئة التطوير على الأقل — عندها يرجع الـ API خطأ 400 صريحًا بدل الحذف الصامت.

---

## H-4 · شات الذكاء الاصطناعي مكسور بالتصميم — دور رسالة خاطئ

**الملف:** `apps/web/components/public/AIChatWidget.tsx:8, 29`

الويدجت يخزّن الأدوار كـ `'ai' | 'user'` ويرسلها كما هي:
```ts
messages: newMessages.map(m => ({ role: m.role, content: m.text }))   // role = 'ai'
```

مواصفة OpenAI/Groq تقبل `system | user | assistant` فقط. `'ai'` ليست دورًا صالحًا → المزوّد يرجع 400 → `callProvider` يرمي → الـ fallback loop يستنفد كل المزوّدين → **503 لكل رسالة**.

مسار Gemini ينجو بالصدفة فقط لأن `ai.service.ts:194` يكتب `m.role === 'user' ? 'user' : 'model'` (أي شيء غير `user` يصير `model`).

**الحالة الحالية على السيرفر:** لا يوجد أي مزوّد مُفعَّل، فالردّ هو رسالة «غير متصل» ثابتة — الخطأ مخفي حاليًا وسيظهر فور إضافة مفتاح Groq.

**الإصلاح:** استخدم `'assistant'` بدل `'ai'` في الـ state، أو حوّلها عند الإرسال:
```ts
role: m.role === 'ai' ? 'assistant' : 'user'
```

**مشكلة ثانية في نفس الملف (سطر 24):** الويدجت يقرأ `process.env.NEXT_PUBLIC_API_BASE_URL` مباشرة بدل استخدام المسار النسبي `/api/v1` الذي يستخدمه `api-client.ts:3-5` في الإنتاج. لو كانت قيمة المتغيّر وقت الـ build خاطئة، سيحاول المتصفح الاتصال بعنوان خاطئ. **وحّد المصدر.**

---

## H-5 · استعلام الـ RAG الخام غير صالح — سيفشل فور تفعيل Gemini

**الملف:** `apps/api/src/modules/ai/ai.service.ts:115-122`

```sql
SELECT topic, question, answer, 1 - (embedding <=> $1::vector) as similarity
FROM "AiKnowledgeBase"
WHERE isActive = true AND embedding IS NOT NULL
      ↑ بلا علامتَي اقتباس
```

Postgres يحوّل المعرّفات غير المقتبسة إلى حروف صغيرة → يبحث عن عمود اسمه `isactive`. العمود الفعلي (كما ينشئه Prisma) هو `"isActive"` بحرف كبير.

**النتيجة:** `ERROR: column "isactive" does not exist` → الاستعلام يفشل → `processChat` يرمي 500.

**مشكلة ثانية في نفس البلوك:** العمود `embedding` **غير موجود أصلاً في قاعدة البيانات** (راجع H-1) — ولا امتداد `pgvector` مُثبَّت.

**لماذا لا يظهر الخطأ اليوم:** `generateEmbedding()` يبحث عن مزوّد اسمه يحوي `gemini`؛ لا يوجد أي مزوّد → يُرجع `[]` → شرط `if (vector.length > 0)` لا يتحقّق → البلوك كله يُتخطّى. **الخطأ نائم، وسيستيقظ في اللحظة التي يضيف فيها العميل مفتاح Gemini.**

نفس المشكلة في `saveKnowledgeBase` (سطور 60 و 68) — `UPDATE "AiKnowledgeBase" SET embedding = ...` على عمود غير موجود.

**الإصلاح:** اقتبس المعرّف (`"isActive"`)، ثم أضف migration بـ `CREATE EXTENSION IF NOT EXISTS vector;` وعمود `embedding` — أو عطّل مسار الـ RAG بالكامل حتى يُجهَّز.

---

## H-6 · مفتاح تشفير افتراضي مكتوب في الكود

**الملف:** `apps/api/src/modules/integrations/integrations.service.ts:11`

```ts
const secret = process.env.ENCRYPTION_KEY || 'insan-default-secret-key-32-chars!';
```

لو لم يكن `ENCRYPTION_KEY` مضبوطًا في `.env.production`، كل الأسرار (توكن فيسبوك، مفاتيح التكاملات) تُشفَّر بمفتاح **منشور في الريبو**. التشفير يصبح تمويهًا لا حماية.

**ما يزيد الاحتمال:** `ENCRYPTION_KEY` موجود في `.env.example` لكنه **غير موجود في `.env.production.example`** — أي أن أي شخص يتبع ملف الإنتاج النموذجي سيفوّته.

كما أن `main.ts` يتحقّق من `JWT_ACCESS_SECRET` و `JWT_REFRESH_SECRET` عند الإقلاع في الإنتاج، لكنه **لا يتحقّق من `ENCRYPTION_KEY` إطلاقاً**.

**ملاحظة تقنية إضافية:** الخوارزمية `aes-256-cbc` بلا HMAC — النص المشفَّر قابل للتلاعب (malleable). الأنسب `aes-256-gcm`.

**الإصلاح:**
1. احذف القيمة الافتراضية — ارمِ خطأ عند الإقلاع إن كان المتغيّر غائبًا في الإنتاج.
2. أضف `ENCRYPTION_KEY` إلى `.env.production.example` وإلى فحص `PRODUCTION_REQUIRED` في `main.ts:19-22`.
3. تحقّق من ضبطه على السيرفر الآن — وإن لم يكن، أعد إدخال أسرار التكاملات بعد ضبطه.

---

# 🟡 متوسط

## M-1 · الموقع يعمل على HTTP فقط — كلمة مرور الأدمن تمرّ بالنص الصريح

`infra/nginx.conf` يحتوي `server { listen 80; }` فقط — **لا يوجد بلوك `listen 443 ssl` إطلاقاً**، رغم أن `docker-compose.prod.yml:58` ينشر المنفذ 443 و `:62` يركّب مجلد `./infra/ssl`.

أثبتُّه عمليًا: وصلت للـ API عبر `http://169.58.77.61` بدون أي تحويل لـ HTTPS.

**التأثير:** تسجيل دخول الأدمن (`admin@insan-platform.com` + كلمة المرور) يمرّ عبر الشبكة **بنص صريح**. كذلك الـ access token وكوكي الـ refresh. أي شخص على نفس الشبكة أو على أي راوتر في المسار يستطيع التقاطها. لمنصّة صحية هذا غير مقبول.

**ملاحظة إضافية:** الكوكيز لن تحمل خاصية `Secure` بفاعلية على HTTP.

**الإصلاح:** ثبّت شهادة Let's Encrypt (certbot)، أضف بلوك 443، وحوّل 80 → 443 بـ 301. (`infra/nginx.conf.backup` موجود — راجعه، قد يحتوي على الإعداد القديم.)

---

## M-2 · XSS مخزَّن محتمل في صفحة المستثمرين

**الملف:** `apps/api/src/modules/investors/investors.service.ts:31-40`

```ts
allowedTags: [...defaults, 'iframe'],
allowedAttributes: { 'iframe': ['src', ...], '*': ['class', 'style'] },
allowedSchemes: ['http', 'https', 'data']       // ← 'data' مع 'iframe'
```

السماح بـ `iframe` + مخطط `data:` معًا يسمح بـ `<iframe src="data:text/html;base64,...">` — تنفيذ HTML/JS كامل في سياق الموقع. كما أن `style` على كل العناصر يسمح بحقن CSS (تشويه الصفحة / clickjacking بصري).

المدخل من الأدمن فقط، فالخطورة أقل — لكن مع C-3 (تسريب الصلاحيات) وأي مستخدم بصلاحية محدودة، يصبح مسار تصعيد.

**الإصلاح:** احذف `'data'` من `allowedSchemes`. قيّد `iframe` بقائمة نطاقات مسموحة (`youtube.com`, `google.com/maps`) عبر `allowedIframeHostnames`. احذف `style` من `'*'`.

---

## M-3 · `googleMapsUrl` غير مُتحقَّق منه يُمرَّر مباشرة إلى `<iframe src>`

**الملف:** `apps/web/app/hospitals/[slug]/page.tsx:88`

```tsx
<iframe src={h.googleMapsUrl} ... />
```

`CreateHospitalDto:45` يتحقّق منه بـ `@IsString()` فقط — أي نص يمر، بما فيه `javascript:` أو `data:`.

**هذا يتضخّم مع الخطة الجديدة:** السيكشن 7 يضيف مصفوفة `locations` كل عنصر فيها `mapsUrl` يُعرض في `iframe`. عدد نقاط الحقن يتضاعف.

**الإصلاح:** أضف قاعدة تحقّق صارمة في الـ DTO:
```ts
@Matches(/^https:\/\/(www\.)?google\.com\/maps\/embed/, {
  message: 'يجب أن يكون رابط Google Maps Embed رسمي (https://www.google.com/maps/embed...)'
})
```
وطبّق نفس القاعدة على كل `mapsUrl` داخل `locations`. أضف `sandbox` على الـ iframe.

---

## M-4 · صفحة الأسئلة الشائعة فارغة دائماً + ستنهار عند الإصلاح

**تم إثباته لايف:** `GET http://169.58.77.61/api/v1/faqs` → **404 — `Cannot GET /api/v1/faqs`**

`apps/web/lib/public-api.ts:154` يستدعي `/faqs`، والدالة المساعدة `pub()` تبتلع الخطأ وتُرجع `null` → `apps/web/app/faq/page.tsx` يعرض «لا توجد أسئلة شائعة» **دائماً**. لا يوجد `FaqsModule` في `app.module.ts`.

**قنبلة موقوتة:** موديل `FaqItem` في الـ schema يعرّف `topic`, `question`, `answer` كـ **`Json`** (ثنائية اللغة)، بينما `public-api.ts:95-101` يعرّفها كـ **`string`**، والصفحة تكتب `{faq.question}` مباشرة. في اللحظة التي يُضاف فيها الـ endpoint، ستحاول React عرض كائن → **`Objects are not valid as a React child` → انهيار الصفحة**.

**الإصلاح:** أنشئ `FaqsModule` بـ endpoint عام، صحّح الأنواع في `public-api.ts`، واستخدم الدالة `t()` عند العرض (كما في باقي الصفحات).

---

## M-5 · `apps/admin` — تطبيق يتيم لا يُبنى أبداً

المجلد `apps/admin/` يحتوي على **ملف واحد**: `app/news/page.tsx` (65 سطر، مضاف في هذا الـ commit).

لا يوجد فيه `package.json`، ولا `next.config`، ولا `tsconfig`. `Dockerfile:11-12` ينسخ `apps/api/package.json` و `apps/web/package.json` فقط. `pnpm-workspace.yaml` يحتوي `apps/*` لكن pnpm يتجاهل مجلدًا بلا `package.json`.

**النتيجة:** هذا الملف **كود ميّت** — لا يُبنى، لا يُنشر، لا يُنفَّذ. على الأرجح وُضع في المكان الخطأ (لوحة الأدمن الفعلية هي `apps/web/app/admin/`، وفيها بالفعل `news/NewsClient.tsx`).

**الإصلاح:** احذف `apps/admin/` بالكامل، أو انقل الملف لمكانه الصحيح إن كان مقصودًا. **هذا مهم للخطة:** الموديل المنفِّذ قد يعدّل الملف الخطأ ويحتار لماذا لا يتغيّر شيء.

---

## M-6 · تعديلات الأدمن لا تظهر إلا بعد 60 ثانية (ISR)

`apps/web/lib/public-api.ts:5` → `const REVALIDATE = 60`، وكل الصفحات العامة تستخدم `next: { revalidate: 60 }`.

لا يوجد أي استدعاء لـ `revalidatePath()` أو `revalidateTag()` بعد الحفظ في الأدمن.

الخطة تَعِد بـ «تحكم كامل من لوحة الأدمن» — والمستخدم سيعدّل، يفتح الصفحة، لا يرى شيئًا، ويظن أن الحفظ فشل (خصوصًا مع H-2/H-3 حيث الحفظ يفشل فعلاً أحيانًا). خلط تشخيصي مؤكّد.

**الإصلاح:** إمّا webhook لإعادة التحقّق عند الحفظ، أو — كحد أدنى — اذكر التأخير صراحة في واجهة الأدمن («التغييرات تظهر خلال دقيقة»).

---

## M-7 · `facebook-sync` يعمل كل ساعة بلا داعٍ وقد يرمي

**الملف:** `apps/api/src/modules/news/facebook-sync.service.ts`

- `@Cron(CronExpression.EVERY_HOUR)` يعمل دائمًا حتى لو لم تُضبط أي بيانات اعتماد (سطر 28-31 يخرج بتحذير كل ساعة → ضجيج في الـ logs).
- سطر 46: `for (const post of data.data)` — لو رجع Graph API استجابة بلا حقل `data` (خطأ غير متوقّع، rate limit، صيغة مختلفة)، سيرمي `TypeError`. الـ try/catch يلتقطه لكنه يُسجَّل كخطأ عام يصعب تشخيصه.
- سطر 62: `slug: \`fb-${post.id}\`` — معرّفات فيسبوك تحوي `_` وأرقامًا؛ صالحة كـ slug لكن قبيحة في الـ URL وغير قابلة للـ SEO.
- المنشورات تُنشر مباشرة بـ `status: PUBLISHED` — **لا توجد أي مراجعة بشرية**. أي منشور على صفحة فيسبوك يظهر فورًا على الموقع الطبي. مخاطرة تحريرية.

**الإصلاح:** `if (!Array.isArray(data?.data)) return`، غيّر الحالة الافتراضية إلى `DRAFT`، وتخطَّ الـ cron لو لم تكن البيانات مضبوطة.

---

## M-8 · `pnpm-workspace.yaml` يحتوي قيمًا نائبة حرفية

```yaml
allowBuilds:
  '@nestjs/core': set this to true or false      # ← نص حرفي، ليس boolean
```

`allowBuilds` ليس مفتاحًا معروفًا في pnpm 9.15 (المستخدم في `Dockerfile:6`) — سيُتجاهل أو يُنتج تحذيرًا. لكن لو تُرقّي لـ pnpm 10 قد يفشل الـ parsing ويكسر الـ build داخل Docker.

الإعداد الصحيح موجود بالفعل في `apps/api/package.json` تحت `pnpm.onlyBuiltDependencies`.

**الإصلاح:** احذف بلوك `allowBuilds` بالكامل.

---

# ⚪ منخفض

| # | الملف | الملاحظة |
|---|-------|----------|
| L-1 | `docker-compose.prod.yml:67-68` | `volumes: pgdata` معرَّف لكن لا توجد خدمة `db` تستخدمه — بقايا. |
| L-2 | `Dockerfile:19` | مرحلة `api-builder` تنسخ `apps/web` كاملاً بلا داعٍ — يبطئ الـ build ويكبّر الـ image. |
| L-3 | `scripts/start.sh:23` | `npx prisma generate` عند كل إقلاع حاوية — تم توليده وقت الـ build بالفعل (`Dockerfile:21`). يضيف ثوانٍ لكل إعادة تشغيل. |
| L-4 | `deploy.ps1:43` | يشغّل الـ seed عند **كل** نشر، مع `|| echo "Seed skipped"` يبتلع أي فشل حقيقي. راجع `seed.ts` للتأكد من أنه idempotent. |
| L-5 | `run-seed.ps1:26` | `$remoteScript` يُحسب ثم لا يُستخدم إطلاقاً (سطر 27 يستخدم `$commands`). كود ميّت. |

---

# 📋 مراجعة خطة `implementation_plan.md`

الخطة سليمة **معمارياً** — تقسيم السيكشنات منطقي، وإعادة استخدام مكوّنات الصفحة الرئيسية قرار صحيح. المشاكل كلها في **التفاصيل التنفيذية**، وهي بالضبط النوع الذي يعطّل موديلاً ينفّذ حرفياً.

## أخطاء واقعية في الخطة (ستنتج كودًا لا يعمل)

### P-1 · اسم حقل خاطئ — `hospitalId` غير موجود في `NewsPost`
**السيكشن 6 من الخطة:** «يعرض أحدث 4 مقالات `NewsPost` المرتبطة بهذا المستشفى (`hospitalId`)»

الحقل الفعلي في `schema.prisma:313` اسمه **`relatedHospitalId`**، والعلاقة اسمها `relatedHospital`. لا يوجد `hospitalId` في `NewsPost`.

الموديل المنفِّذ سيكتب `where: { hospitalId }` → خطأ TypeScript من Prisma Client → توقف.

### P-2 · حقل «التخصص» غير موجود في `Clinic`
**السيكشن 2 من الخطة:** «اسم العيادة + التخصص + مواعيد الدوام»

موديل `Clinic` (`schema.prisma:239-249`) يحتوي **فقط** على: `id`, `medicalCenterId`, `name` (Json), `schedule` (Json), `createdAt`, `updatedAt`.

**لا يوجد حقل تخصص.** الحل بلا تغيير schema: اعرض اسم المركز الطبي الأب مكانه.

### P-3 · العيادات لا تصل أصلاً إلى الواجهة
`hospitals.service.ts:58-70` (`findBySlug`) يُرجع `medicalCenters` و `doctors` فقط. **لا يُرجع `clinics` ولا `newsPosts`.** أثبتُّه لايف — حقول استجابة `GET /api/v1/hospitals/delta-hospital` هي:
```
brandColor, createdAt, customFields, description, doctors, googleMapsUrl,
heroImage, id, logoUrl, medicalCenters, metaDescription, metaTitle,
name, shortDescription, slug, status, updatedAt
```
الخطة تقول «تحديث `hospitals.service.ts` لإرجاع البيانات الجديدة» لكنها لا تحدّد **أي** علاقات يجب تضمينها. الموديل سيضيف الأعمدة الجديدة فقط ويترك العيادات والأخبار فارغة.

### P-4 · لا توجد طريقة لربط طبيب بقسم
**الخطة، صفحة القسم:** «الأطباء المتخصصين في هذا القسم»

`Doctor` مرتبط بـ `Hospital` (عبر `DoctorHospital`) وبـ `MedicalCenter` — **ولا يوجد أي رابط بينه وبين «قسم»**، والأقسام نفسها ستكون مجرد Json. لا يوجد استعلام ممكن.

**الحل المقترح (بلا تغيير schema):** خزّن `doctorIds: string[]` **داخل** كائن القسم في الـ Json، واجعل الأدمن يختار الأطباء من قائمة متعددة. حل صريح ومحدَّد لا يحتاج ابتكارًا من الموديل.

### P-5 · تعارض في العدد — «5 حقول» والجدول فيه 6
عنوان الجدول يقول «يحتاج موديل `Hospital` إلى **5** حقول جديدة»، والجدول يسرد **6** صفوف. موديل ينفّذ حرفيًا قد يسقط أحدها. **العدد الصحيح: 6.**

### P-6 · لا ذكر لـ `create-hospital.dto.ts` — وهذا يُفشل الخطة بالكامل
راجع **H-3**. الخطة تذكر schema + service + public-api، وتغفل الـ DTO. بدونه لا يُحفظ أي حقل جديد، **بلا أي رسالة خطأ**. هذه أخطر ثغرة في الخطة.

### P-7 · لا ذكر لخطوة الـ migration الآمنة
راجع **H-1**. الخطة تقول «إنشاء migration» فقط. الأمر البديهي (`prisma migrate dev`) **يمسح قاعدة الإنتاج**. يجب أن تنص الخطة حرفيًا على الأمر الآمن.

### P-8 · تعارض بين `contactInfo` الجديد وحقول الفورم الحالية
الخطة تضيف `contactInfo` (Json: تليفون/إيميل/عنوان)، بينما `HospitalModal.tsx` **بالفعل** فيه حقول `phone`, `email`, `address` — لكنها تُحذف بصمت (H-2). لو أضاف الموديل تبويب «التواصل» بلا حذف الحقول القديمة، ستظهر حقول مكرّرة: بعضها يحفظ وبعضها لا. ارتباك مؤكّد للمستخدم.

**القرار المطلوب:** احذف حقول `phone/email/address/city/website/brandId` القديمة من الفورم نهائيًا، واستبدلها بتبويب `contactInfo` الجديد.

### P-9 · رابط الحجز من كارت العيادة يتخطّى أسئلة الحجز
**الخطة، السيكشن 2:** «زر احجز موعد مربوط بـ `?hospitalId=...`»

لكن أسئلة الحجز الديناميكية (`BookingQuestion`) مرتبطة بـ **المركز الطبي** لا بالمستشفى (`AppointmentForm.tsx:51-75` يجلب الأسئلة عند تغيّر `medicalCenterId` فقط). الربط بـ `hospitalId` وحده يعني أن المريض لن يرى أسئلة المركز أبداً.

**الحل:** استخدم `?medicalCenterId=<id>&hospitalId=<id>` معًا. صفحة `/book` تدعم كلا المعاملين بالفعل (`app/book/page.tsx:13`).

### P-10 · نقطة تصميمية مفتوحة بلا حسم
الخطة تسأل في «نقاط للمراجعة»: «هل نُبقي الصورة على اليسار أم نعكسها؟»

**سؤال مفتوح داخل خطة تُسلَّم لموديل لا يبتكر = توقّف أو اختيار عشوائي.** يجب حسمه قبل التسليم. (حُسم في الخطة الجديدة: نفس ترتيب `FeaturedServicesSection` بلا تغيير — أقل مخاطرة بصرية.)

## قرار معماري يحتاج انتباه: `departments` كـ Json

الخطة تخزّن الأقسام في عمود `Json?`، مع أن لكل قسم **صفحة مستقلة بـ URL** (`/hospitals/[slug]/departments/[deptSlug]`).

| | Json (اختيار الخطة) | جدول `HospitalDepartment` |
|---|---|---|
| سرعة التنفيذ | ✅ أسرع بكثير | ❌ أبطأ |
| تفرّد الـ `deptSlug` | ❌ لا ضمان — قسمان بنفس الـ slug = صفحة عشوائية | ✅ `@@unique` |
| ربط الأطباء | ⚠️ يدوي عبر `doctorIds[]` | ✅ علاقة حقيقية |
| فهرسة/بحث | ❌ لا | ✅ نعم |

**التوصية:** **أبقِ Json** (لتقليل حجم التغيير والمخاطرة على قاعدة إنتاج مُنحرِفة أصلاً) — **بشرط** إضافة تحقّق صريح يمنع تكرار الـ `deptSlug` داخل نفس المستشفى، ومعالجة `notFound()` عند عدم وجود القسم. كلاهما مضمَّن في الخطة الجديدة.

## ما تفتقده الخطة بالكامل

- ❌ لا خطوة **نسخ احتياطي** لقاعدة البيانات قبل الـ migration.
- ❌ لا **معيار تحقّق** بعد كل مرحلة (كيف يعرف المنفّذ أنه نجح؟).
- ❌ لا **خطة تراجع** (rollback) لو فشل شيء في الإنتاج.
- ❌ لا تحديد لملف **`public-api.ts` interface `Hospital`** — الأنواع ستفشل في `tsc`.
- ❌ لا ذكر لـ **`revalidate`** — المستخدم لن يرى تغييراته فورًا (M-6).
- ❌ لا **قيم افتراضية** واضحة عندما تكون الحقول الجديدة `null` (كل المستشفيات الحالية ستكون كذلك يوم الإطلاق) → الصفحة ستُعرض فارغة أو تنهار.
- ❌ لا **ترتيب نشر**: هل نبني الفرونت قبل التأكد من وصول البيانات؟ (يجب: Backend → تحقّق → Admin → تحقّق → Frontend.)

---

# ✅ الترتيب الموصى به للتنفيذ

| # | المهمة | لماذا الآن |
|---|--------|-----------|
| **0** | **غيّر كلمة مرور قاعدة البيانات** (C-1) | تسريب نشط |
| **1** | خذ نسخة احتياطية كاملة (`pg_dump`) | قبل أي شيء يلمس الـ DB |
| **2** | أصلح C-2 و C-3 و C-4 و C-5 (كلها تعديلات صغيرة) | ثقوب مفتوحة على الإنترنت |
| **3** | فعّل HTTPS (M-1) | كلمة مرور الأدمن مكشوفة |
| **4** | أصلح `HospitalModal` الأساسي (H-2) | الخطة تُبنى فوقه |
| **5** | **ثم** نفّذ خطة صفحات المستشفيات | راجع `PLAN_HOSPITAL_PAGES_V2.md` |
| **6** | نظّف الانحراف (H-1) بـ migration توثيقية | دَين تقني يزداد خطورة |

---

**الخطة التنفيذية المفصّلة الجاهزة للتسليم لموديل منفِّذ:** [`PLAN_HOSPITAL_PAGES_V2.md`](./PLAN_HOSPITAL_PAGES_V2.md)
