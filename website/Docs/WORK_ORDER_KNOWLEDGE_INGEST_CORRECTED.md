# تصحيح — أمر شغل ابتلاع قاعدة المعرفة

> **يحلّ محل المهام 4 و5 في `scratch/WORK_ORDER_KNOWLEDGE_INGEST.md`.**
> باقي الأمر الأصلي (المهام 1، 2، 3، 6) **صحيح** — نفّذه زي ما هو.

---

## ✅ تحديث 2026-08-08 — الطريق جوه الحاوية بقى شغّال

الكلام تحت اتكتب قبل كوميتين من ووركر الريسيبشنيست. **الوضع اتغيّر، والتشغيل
جوه الحاوية بقى هو الطريق المفضّل:**

| العقبة | الحالة دلوقتي |
|---|---|
| `@prisma/client` مش بيتلاقى جوه الحاوية | ✅ **اتحلّت** في `dab19a3` — السكربت بقى يجرّب `/app/node_modules` الأول |
| ملفات المعرفة مش موجودة جوه الحاوية | ✅ **اتحلّت** — ضفت `../business:/business:ro` في `docker-compose.prod.yml` |
| `-w /app/apps/api` مش موجود | ⚠️ **لسه غلط** — استخدم `-w /app` |

**فالأمر الصحيح بقى:**

```bash
docker exec -w /app insan-api \
  npx ts-node --compiler-options '{"module":"CommonJS"}' \
  /receptionist/scripts/ingest-knowledge.ts --check
```

> ⚠️ **لازم تعمل نشرة الأول** عشان الـ mount الجديد (`/business`) يتفعّل — الـ
> volumes بتتقرأ وقت إنشاء الحاوية، فحاوية شغّالة مش هتشوفه.

**ابدأ بـ `--check`** (اتضاف في `82b9065`) — بيتأكد إن مفتاح Gemini شغّال فعلًا
وإن عمود الـ vector اتضاف، **من غير ما يكتب أو يستهلك المفتاح**. لو نجح، كمّل بـ
`--dry-run` وبعدين التشغيل الفعلي.

**الطريق على الهوست (تحت) لسه صالح كبديل** لو الحاوية عملت أي مشكلة.

---

---

## ⛔ ليه التصحيح ده موجود

أمر الشغل الأصلي بيقول شغّل سكربت الابتلاع **جوه حاوية الـ API**:

```bash
docker exec -w /app/apps/api insan-api npx ts-node ... /receptionist/scripts/ingest-knowledge.ts
```

**ده مستحيل ينجح**، ومش غلطة مسار تتصلّح بتغيير كلمة. السكربت محتاج حاجتين
**ولا واحدة منهم موجودة جوه الحاوية**:

| السكربت بيدوّر على | جوه الحاوية | موجود؟ |
|---|---|---|
| `@prisma/client` عن طريق `../../website/node_modules/` | `/website/node_modules` | ❌ (الموجود `/app/node_modules`) |
| ملفات المعرفة عن طريق `path.resolve(__dirname,'..','..')` | `/business/knowledge` | ❌ (المركوب `/receptionist` بس) |

وكمان `-w /app/apps/api` **مش موجود** — حاوية الإنتاج فيها `/app/dist` و
`/app/prisma` و`/app/node_modules` بس (شوف `Dockerfile` سطور 40-44).

**السبب الحقيقي:** السكربت ده **مصمَّم يشتغل على الهوست**، وده مقصود ومكتوب في
تعليق جوّه السكربت نفسه (سطر 36-39). الـ "بديل" المذكور في آخر المهمة 4 من
الأمر الأصلي هو في الحقيقة **الطريق الصحيح الوحيد**.

على الهوست المسارات بتحلّ صح:
```
/root/INSAN-Healthcare-Platform/website/node_modules/@prisma/client   ✅
/root/INSAN-Healthcare-Platform/business/knowledge                     ✅
```

---

## المهمة 4 (مُصحَّحة) — جهّز الهوست

السكربت محتاج `node_modules` و Prisma client **مولَّد** على الهوست. الحاوية
عندها نسخة بتاعتها، بس السكربت مش بيشوفها.

### 4.1 اتأكد من المتاح

```bash
cd /root/INSAN-Healthcare-Platform
node --version
ls -d website/node_modules/@prisma/client 2>/dev/null && echo "prisma client: موجود" || echo "prisma client: ناقص"
```

| النتيجة | الخطوة |
|---|---|
| `node` شغّال و prisma client **موجود** | ✅ عدّي للمهمة 5 |
| prisma client **ناقص** | نفّذ 4.2 |
| `node: command not found` | 🛑 **قف وبلّغ** — الهوست مفيهوش Node |

### 4.2 نصّب (لو ناقص)

```bash
cd /root/INSAN-Healthcare-Platform/website
corepack enable && corepack prepare pnpm@9.15.0 --activate
pnpm install --no-frozen-lockfile
cd apps/api && npx prisma generate
```

> ℹ️ ده بينصّب على الهوست بس. **مش بيلمس الحاويات الشغّالة ولا الموقع.**
> ممكن ياخد شوية وقت وحجم على القرص — لو المساحة ضاقت، شغّل
> `docker builder prune -af` الأول.

**الصق ناتج آخر أمرين.**

---

## المهمة 5 (مُصحَّحة) — شغّل الابتلاع من الهوست

### 5.1 هات رابط قاعدة البيانات

السكربت بيتصل بالقاعدة من الهوست. القاعدة منشورة على `127.0.0.1:5432` (شوف
`docker-compose.prod.yml`)، فالهوست بيوصلها عادي.

```bash
cd /root/INSAN-Healthcare-Platform/website
grep -c '^DATABASE_URL=' .env.production
```
**لازم يطلع `1`.** (متلصقش القيمة نفسها.)

### 5.2 جرّب بالفاضي الأول — مش بيكتب ولا بيستهلك المفتاح

```bash
cd /root/INSAN-Healthcare-Platform/website
export $(grep '^DATABASE_URL=' .env.production | xargs)
cd apps/api
npx ts-node --compiler-options '{"module":"CommonJS"}' \
  ../../../receptionist/scripts/ingest-knowledge.ts --dry-run
```

**المتوقّع:** `194 patient-facing section(s) collected.` وجدول بـ 17 ملف.

| النتيجة | الخطوة |
|---|---|
| رقم قريب من 194 | ✅ كمّل |
| رقم بعيد جدًا، أو خطأ | 🛑 **قف وبلّغ بالناتج كما هو** |

> ⚠️ لو طلع `Cannot find module '../../website/node_modules/@prisma/client'`
> يبقى المهمة 4.2 ماتنفّذتش صح — ارجعلها.

### 5.3 شغّله فعليًا

نفس الأمر من غير `--dry-run`:

```bash
cd /root/INSAN-Healthcare-Platform/website
export $(grep '^DATABASE_URL=' .env.production | xargs)
cd apps/api
npx ts-node --compiler-options '{"module":"CommonJS"}' \
  ../../../receptionist/scripts/ingest-knowledge.ts
```

**المتوقّع:** عدّاد يوصل `embedded 194/194` وبعده `✓ 194 row(s) written.`

---

## باقي الأمر الأصلي — صحيح، نفّذه زي ما هو

| المهمة | الحالة |
|---|---|
| 1 — نشر الكود | ✅ صحيحة |
| 2 — الـ migration | ✅ صحيحة (الملف موجود، اتأكدت منه) |
| 3 — مزوّد Gemini | ✅ صحيحة — **ولسه دي اللي هتوقفك غالبًا لو مفيش مفتاح** |
| 6 — عزل النطاق | ✅ صحيحة — **وده أهم فحص في الأمر كله، متتخطاهوش** |
| 7 — إعادة تشغيل الـ API | ✅ صحيحة |

> ℹ️ **المهمة 7 بقت أأمن:** سكربت النشر اتصلح النهاردة فبقى يبني الصور الأول
> وبعدين يبدّل الحاويات، بدل ما ينزّل الموقع كله طول مدة البناء.

---

## 📋 قواعد ملزمة

1. **ممنوع `db:seed`** — بيمسح محتوى اتدخل يدويًا. (`seed-brands.ts` وحده الآمن.)
2. **متشغّلش السكربت جوه الحاوية** — مش هينفع، والسبب مشروح فوق.
3. **متلصقش أي سر في الشات** — ولا في سطر أوامر.
4. **أي نتيجة مختلفة عن المتوقع — قف وبلّغ.** متصلّحش من عندك.

## 📊 التقرير المطلوب
```
المهمة 1 (النشر): commit = [اكتبه]
المهمة 2 (migration): [الصق فحص الأعمدة]
المهمة 3 (Gemini): [الصق حالة المزوّد]
المهمة 4 (تجهيز الهوست): ✅/❌ — [الصق]
المهمة 5 (الابتلاع): [الصق آخر سطر]
المهمة 6 (عزل النطاق): [الصق الجدولين — الأهم]
المهمة 7 (إعادة التشغيل): ✅/❌

مشاكل واجهتني: [اكتبها، متخفيش حاجة]
```
