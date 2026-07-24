# 12 — Deployment Documentation (Replit Implementation)

> **Document Version:** 1.1
> **Status:** Final
> **Last Updated:** 2025-07-16
> **Source of Truth:** Yes

> **Cross-references:** For the full architecture rationale, see `../architecture/01_ARCHITECTURE.md`. For the complete folder structure including Dockerfiles, see `../architecture/10_FOLDER_STRUCTURE.md`.

---

## 1. Docker — كل خدمة بصورة مستقلة

### `apps/web/Dockerfile` (Next.js، Multi-stage)
```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build   # next.config.js: output: 'standalone'

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

### `apps/api/Dockerfile` (NestJS، Multi-stage)
```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
EXPOSE 4000
CMD ["node", "dist/main.js"]
```

> **مبدأ Vendor-neutrality:** الصورتان تعملان Identical على أي بيئة تدعم Docker — Replit Deployments، Railway، Render، DigitalOcean، AWS ECS، أو VPS عادي.

---

## 2. Docker Compose — بيئة التطوير المحلية

```yaml
# infra/docker-compose.dev.yml
version: "3.9"
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: insan
      POSTGRES_USER: insan_user
      POSTGRES_PASSWORD: dev_password
    ports: ["5432:5432"]
    volumes: ["pg_data:/var/lib/postgresql/data"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  minio:                      # محاكاة S3 محلياً بدون الحاجة لحساب سحابي وقت التطوير
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports: ["9000:9000", "9001:9001"]

  api:
    build: ../apps/api
    env_file: ../apps/api/.env
    ports: ["4000:4000"]
    depends_on: [postgres, redis, minio]

  web:
    build: ../apps/web
    env_file: ../apps/web/.env
    ports: ["3000:3000"]
    depends_on: [api]

volumes:
  pg_data:
```

**التشغيل محلياً:** `docker compose -f infra/docker-compose.dev.yml up` ثم `npm run db:migrate && npm run db:seed`.

---

## 3. الإنتاج (Production)

- **الأفضلية:** خدمات مُدارة بدل Self-hosted للمكوّنات الحرجة (لتقليل عبء الصيانة)، مع الحفاظ على البورتابيليتي:
  - Postgres → أي مزوّد Postgres مُدار قياسي (Connection String فقط يتغيّر)
  - S3 Storage → أي مزوّد متوافق مع S3 API
  - Redis → أي مزوّد Redis مُدار (أو Container عادي لو الحجم صغير)
- `apps/web` و `apps/api` نفس صور Docker المبنية في CI، تُنشر كخدمتين منفصلتين (Container Services) خلف HTTPS.
- **Environment Variables** تُضبط من واجهة منصة الاستضافة (Secrets) وليس داخل الصور نفسها.

---

## 4. استراتيجية النسخ الاحتياطي (Backup)

- **قاعدة البيانات:** `pg_dump` تلقائي يومي (Cron Job)، الاحتفاظ بآخر 30 نسخة (Rolling)، تُخزَّن في S3-compatible bucket منفصل عن bucket الوسائط.
- **الوسائط (Media):** تفعيل Versioning على الـ Bucket نفسه (معظم مزودي S3 يدعمونها) كطبقة حماية إضافية ضد الحذف بالخطأ.
- **الإعدادات الحساسة (`IntegrationSetting`):** مشمولة تلقائياً ضمن نسخ قاعدة البيانات (مشفّرة أصلاً بالتخزين).

## 5. استراتيجية الاسترجاع (Restore)

1. تحديد آخر نسخة سليمة من الـ Backup.
2. استرجاع قاعدة البيانات على بيئة مؤقتة (Staging) أولاً للتحقق من سلامتها.
3. تبديل الـ `DATABASE_URL` للإنتاج فقط بعد التأكد.
4. توثيق كل عملية استرجاع كحدث في سجل تشغيلي منفصل (خارج `AuditLog` لأنه إجراء بنية تحتية وليس نشاط مستخدم).

---

## 6. جاهزية CI/CD

**الأنبوب المقترح (GitHub Actions أو أي أداة مشابهة):**
```
1. Lint & Type-check (كل الـ Workspaces)
2. Unit Tests
3. Build (web + api)
4. Build & Push Docker Images (Tagged بـ commit SHA)
5. Deploy to Staging → اختبار دخان (Smoke Test) على /health
6. الموافقة اليدوية → Deploy to Production
```
> ملحوظة: في مرحلة العمل داخل Replit، خطوات 1-4 يمكن تشغيلها يدوياً/عبر Replit Agent مباشرة؛ أنبوب CI/CD الكامل يُفعَّل لاحقاً وقت الانتقال لاستضافة نهائية.

---

## 7. السجلات (Logging)

- **الصيغة:** JSON منظّم (Structured Logs) وليس نص حر — يسهّل البحث والفلترة لاحقاً بأي أداة مراقبة.
- **المستويات:** `error` (يتطلب انتباه فوري)، `warn`، `info` (عمليات مهمة: نشر، حذف)، `debug` (تطوير فقط، مُعطَّل بالإنتاج).
- كل طلب API يُسجَّل بـ: `method`, `path`, `statusCode`, `duration`, `userId` (لو موجود).

## 8. المراقبة (Monitoring)

- **Health Check Endpoint:** `GET /health` على كل من `web` و `api` — يتحقق من الاتصال بقاعدة البيانات والتخزين، يُستخدَم من قِبل منصة الاستضافة لإعادة تشغيل الخدمة تلقائياً عند الفشل.
- **موصى به (اختياري، يُضاف عند النمو):** أداة تتبّع أخطاء مفتوحة المصدر وقابلة للاستضافة الذاتية (تفادياً لقفل مزوّد واحد) لرصد الأخطاء غير المتوقعة بالإنتاج فور حدوثها + تنبيهات فورية.
- **Uptime Monitoring خارجي:** فحص دوري (كل دقيقة) لـ `/health` من خدمة خارجية مستقلة، مع تنبيه فوري (بريد/SMS) عند التوقف.

---

## 9. أهداف التعافي من الكوارث (Discovery Recovery Objectives — RPO/RTO)

### التعريفات

| المصطلح | التعريف |
|---|---|
| **RPO (Recovery Point Objective)** | أقصى مدة يمكن فقدان بيانات فيها عند حدوث كارثة (كم من البيانات ستفقد؟) |
| **RTO (Recovery Time Objective)** | أقصى مدة مقبولة لإعادة التشغيل بعد الكارثة (كم من الوقت سيكون الموقع معطّل؟) |

### قيم MVP

| المكون | RPO | RTO | المبرر |
|---|---|---|---|
| **قاعدة البيانات (PostgreSQL)** | **24 ساعة** | **4 ساعات** | نسخ احتياطي يومي + إمكانية استرجاع على بيئة مؤقتة |
| **الوسائط (S3 Storage)** | **0** (لا فقدان بيانات) | **ساعة واحدة** | Versioning مفعّل على الـ Bucket + النسخ تتم بشكل مستمر |
| **الإعدادات (Settings/Integrations)** | **24 ساعة** | **ساعتان** | مشمولة ضمن نسخ قاعدة البيانات |
| **الكود المصدري (Git)** | **0** | **ساعة واحدة** | GitHub/Replit — لا فقدان كود ممكن |
| **الـ Environment Variables** | **0** (مُوثّقة يدوياً) | **ساعتان** | `.env.example` + وثائق محدثة |

### ملاحظات على قيم MVP

- **RPO=24h للقاعدة يعني:** في أسوأ حالة، تفقد آخر 24 ساعة من التغييرات (صفحات جديدة، أخبار، إعدادات). هذا مقبول لـ MVP لأن معظم التغييرات يمكن إعادة إدخالها يدوياً.
- **RTO=4h يعني:** الموقع قد يكون معطّل لأكثر من 4 ساعات في حالة كارثة كاملة. هذا مقبول لأن الموقع غير حرج طبياً (لا بيانات مرضى حساسة في MVP).
- **بعد تفعيل Patient Portal:** يجب خفض RPO إلى ≤ 1 ساعة و RTO إلى ≤ 1 ساعة عبر:
  - Continuous WAL archiving للقاعدة (RPO → minutes)
  - Primary-Replica setup (RTO → minutes)
  - Automated failover

---

## 10. دليل التعافي من الكوارث (Disaster Recovery Playbook)

### مرحلة 1: التقييم (Assessment) — 0-15 دقيقة

```
1. تحديد نوع الكارثة:
   □ Database failure (PostgreSQL down)
   □ Storage failure (S3 unavailable)
   □ Application failure (web/api containers down)
   □ Infrastructure failure (host/VM down)
   □ Data corruption (accidental delete/update)
   □ Security breach (unauthorized access detected)

2. تحديد النطاق:
   □ معطّل بالكامل (full outage)
   □ معطّل جزئي (specific feature unavailable)
   □ بيانات متأثرة (data loss/corruption)

3. إخطار الفريق:
   □ Internal notification (Slack/Teams/WhatsApp group)
   □ Status page update (إن وُجد)
```

### مرحلة 2: استرجاع قاعدة البيانات (Database Restore) — 15-120 دقيقة

```
الخطوات:

1. تحديد آخر نسخة احتياطية سليمة:
   $ ls -la s3://backups-insan/db/  | tail -5
   → آخر ملف: insan-db-2026-07-16-02-00.sql.gz

2. تحميل النسخة على بيئة مؤقتة (Staging):
   $ aws s3 cp s3://backups-insan/db/insan-db-2026-07-16-02-00.sql.gz /tmp/

3. استرجاع على بيئة Staging للتحقق:
   $ gunzip /tmp/insan-db-2026-07-16-02-00.sql.gz
   $ psql $STAGING_DATABASE_URL < /tmp/insan-db-2026-07-16-02-00.sql

4. التحقق من سلامة البيانات:
   □ عدد المستخدمين = متوقع
   □ عدد الصفحات المنشورة = متوقع
   □ آخر صفحة محفوظة = التاريخ المتوقع
   □ لا أخطاء في العلاقات (Foreign Key constraints)
   □ `SELECT count(*) FROM "AuditLog" WHERE createdAt > NOW() - INTERVAL '24 hours'` — يُرجع 0 أو أرقام معقولة

5. استرجاع على الإنتاج (فقط بعد التأكد):
   $ psql $PRODUCTION_DATABASE_URL < /tmp/insan-db-2026-07-16-02-00.sql

6. تشغيل Migration إن وُجدت:
   $ npx prisma migrate deploy
```

### مرحلة 3: استرجاع الوسائط (Media Restore) — 10-30 دقيقة

```
1. التحقق من Versioning:
   → إذا الملفات محذوفة بالخطأ: استرجاع من Versioning (كل مزوّد S3 يدعمه)
   → $ aws s3api list-object-versions --bucket insan-media --prefix images/

2. استرجاع ملف محدد:
   $ aws s3api get-object --bucket insan-media --key images/hero.jpg \
     --version-id "abc123" /tmp/hero.jpg

3. في حالة فشل S3 كاملاً:
   → نسخة احتياطية للوسائط محفوظة في bucket منفصل:
   $ aws s3 sync s3://backups-insan/media/ s3://insan-media/
```

### مرحلة 4: استرجاع بيئة التشغيل (Environment Restoration) — 15-60 دقيقة

```
1. إعادة بناء Containers:
   $ docker compose -f infra/docker-compose.prod.yml up -d --build

2. التحقق من Environment Variables:
   □ DATABASE_URL يتصل بنجاح
   □ S3 credentials تعمل
   □ JWT secrets موجودة
   □ Integration tokens مشفّرة وصالحة

3. اختبار الاتصالات:
   $ curl https://api.insan-platform.com/health
   → { "status": "healthy", "checks": { "database": "ok", "s3": "ok" } }
```

### مرحلة 5: التحقق بعد الاسترجاع (Post-Restore Verification) — 15-30 دقيقة

```
□ روابط الصفحة الرئيسية تعمل (AR + EN)
□ صفحات المستشفيات تعرض المحتوى
□ صفحات المراكز الطبية تعمل
□ صفحة الأخبار تعرض المنشورات
□ نموذج الحجز يعمل (إرسال + تأكيد)
□ نموذج التواصل يعمل
□ الشات بوت يرد
□ لوحة التحكم تفتح (Login يعمل)
□ كل شاشات الأدمن تُعرض البيانات
□ الصور والوسائط تظهر (S3 accessible)
□ اللغة العربية تعمل بشكل صحيح (RTL)
□ اللغة الإنجليزية تعمل (LTR)
□ sitemap.xml يحتوي على الصفحات المنشورة
□ robots.txt صحيح
□ SSL certificate صالح
□ لا أخطاء في Console (Browser DevTools)
□ لا أخطاء في Server Logs
```

---

## 11. قائمة التحقق قبل الإطلاق (Production Go-Live Checklist)

> **يجب التحقق من كل بند قبل الإطلاق.** لا يُسمح بالإطلاق بأي بند غير مُكتمل.

### أ. البنية التحتية (Infrastructure)

| # | البند | التحقق |
|---|---|---|
| 1 | Docker images مبنية بنجاح | `docker build` لا يُرجع أخطاء |
| 2 | Images مرفوعة للـ Registry | `docker push` ناجح |
| 3 | قاعدة البيانات جاهزة | `prisma migrate deploy` ناجح + `prisma db seed` مكتمل |
| 4 | S3 bucket موجود وصالح | رفع ملف اختباري + حذفه |
| 5 | Redis يعمل (إن مُستخدَم) | `redis-cli ping` → PONG |
| 6 | SSL certificate مفعّل | `curl -I https://insan-platform.com` → 200 + headers صحيحة |
| 7 | DNS مُكوَّن | `dig insan-platform.com` → IP صحيح |
| 8 | Environment Variables مُكتملة | لا يوجد متغيّر مفقود (قارن مع `.env.example`) |

### ب. الأمان (Security)

| # | البند | التحقق |
|---|---|---|
| 9 | لا أسرار في الكود | `git grep -n "password\|secret\|token" --include="*.ts" --include="*.tsx"` = لا نتائج |
| 10 | JWT secrets قوية | طول ≥ 32 حرف، عشوائية بالكامل |
| 11 | Rate Limiting مفعّل | اختبار: 6 محاولات login فاشلة → 429 |
| 12 | CORS مُكوَّن | `curl -H "Origin: https://evil.com" https://api.insan-platform.com/...` → مرفوض |
| 13 | Security Headers موجودة | (انظر §13 أدناه) |
| 14 | لا ملفات `.env` في Git | `.gitignore` يحتوي `.env*` |
| 15 | Admin login لا يقبل brute force | 5 محاولات → قفل مؤقت |

### ج. المحتوى (Content)

| # | البند | التحقق |
|---|---|---|
| 16 | الصفحة الرئيسية كاملة (AR + EN) | Hero + Statistics + Featured + CTA |
| 17 | صفحات المستشفيات بالكامل | Future + Delta |
| 18 | صفحات المراكز الطبية بالكامل | كل الـ 12 مركز |
| 19 | صفحة About بالكامل | AR + EN |
| 20 | صفحة Contact بالكامل | نموذج + خريطة + بيانات التواصل |
| 21 | صفحة News بالكامل | أخبار يدوية + مزامنة |
| 22 | صفحة Investors مُخفية | لا تظهر في Navigation + `noindex` + `robots.txt` |
| 23 | Navigation يحتوي كل الروابط | Header + Footer |

### د. الأداء (Performance)

| # | البند | التحقق |
|---|---|---|
| 24 | Core Web Vitals مقبولة | LCP < 2.5s, FID < 100ms, CLS < 0.1 |
| 25 | صور مُحسّنة | WebP/AVIF + lazy loading + responsive sizes |
| 26 | Fonts مُحسّنة | `font-display: swap` + preload |
| 27 | Cache headers صحيحة | `Cache-Control` على كل ثابت |

### ه. النسخ الاحتياطي (Backup)

| # | البند | التحقق |
|---|---|---|
| 28 | Backup cron يعمل | التحقق من آخر نسخة في S3 |
| 29 | Restore اختباري ناجح | استرجاع على Staging + تحقق |
| 30 | S3 Versioning مفعّل | التحقق من bucket settings |

---

## 12. مصفوفة السجلات والمراقبة (Logging & Monitoring Matrix)

### مستويات السجل (Log Levels)

| المستوى | الاستخدام | مثال | يُسجَّل بالإنتاج؟ |
|---|---|---|---|
| **`fatal`** | الخادم يوشك على التوقف | Database connection pool exhausted | نعم + alert فوري |
| **`error`** | خطأ يتطلب تدخل بشري | AI provider failed after 4 attempts | نعم + alert |
| **`warn`** | مشكلة مؤقتة أو غير حرجة | Social sync token expiring soon | نعم |
| **`info`** | أحداث تشغيل مهمة | Page published, User logged in | نعم |
| **`debug`** | تفاصيل تطوير فقط | Prisma query timing, Request headers | **لا** (مُعطَّل بالإنتاج) |

### الأحداث المطلوب تسجيلها (Required Events)

| الفئة | الحدث | المستوى | المحتوى الإضافي |
|---|---|---|---|
| **Auth** | Login success | `info` | userId, ip, userAgent |
| **Auth** | Login failure | `warn` | email, reason, ip |
| **Auth** | Account locked | `warn` | userId, attempts, lockDuration |
| **Auth** | Password reset requested | `info` | email, ip |
| **Auth** | Password reset completed | `info` | userId |
| **Auth** | Token refresh | `info` | userId |
| **Auth** | Logout | `info` | userId |
| **CMS** | Entity created | `info` | entity, entityId, userId |
| **CMS** | Entity updated | `info` | entity, entityId, userId, fields changed |
| **CMS** | Entity deleted | `warn` | entity, entityId, userId, full snapshot |
| **CMS** | Entity published | `info` | entity, entityId, userId, publishedAt |
| **CMS** | Entity unpublished | `info` | entity, entityId, userId |
| **CMS** | Bulk operation | `info` | entity, action, count, userId, errors |
| **API** | Request completed | `info` | method, path, statusCode, duration, userId |
| **API** | Request failed | `error` | method, path, statusCode, duration, errorMessage |
| **API** | Rate limit hit | `warn` | ip, userId, endpoint, limit |
| **API** | Validation error | `warn` | path, errors[] |
| **AI** | Chat message received | `info` | conversationId, visitorId, messageLength |
| **AI** | Chat response sent | `info` | conversationId, tokensUsed, responseTime, isFallback |
| **AI** | Chat failed | `error` | conversationId, errorMessage, attempts |
| **AI** | KB fallback used | `info` | conversationId, matchedKbId |
| **Integration** | Social sync started | `info` | provider, accountKey |
| **Integration** | Social sync completed | `info` | provider, fetchedCount, newCount |
| **Integration** | Social sync failed | `error` | provider, errorMessage, tokenStatus |
| **Integration** | Email sent | `info` | to, subject, status |
| **Integration** | Email failed | `error` | to, errorMessage |
| **Infrastructure** | Database connection lost | `fatal` | — |
| **Infrastructure** | Database connection restored | `info` | downtime duration |
| **Infrastructure** | S3 connection failed | `error` | operation, errorMessage |
| **Infrastructure** | Container restarted | `info` | service, reason |

### هيكل السجل الموحد (Standard Log Format)

```json
{
  "timestamp": "2026-07-16T10:30:00.123Z",
  "level": "info",
  "service": "api",
  "message": "Page published",
  "context": {
    "requestId": "req_abc123",
    "userId": "user_xyz",
    "method": "POST",
    "path": "/admin/pages/abc123/publish",
    "duration": 245
  },
  "metadata": {
    "entity": "Page",
    "entityId": "page_abc123",
    "slug": "about-us"
  }
}
```

### المراقبة (Monitoring Expectations)

| المكون | ما يُراقب | الأداة | Alert Threshold |
|---|---|---|---|
| **API Response Time** | متوسط + p95 latency | Structured logs + Metrics endpoint | p95 > 2s |
| **Error Rate** | نسبة 5xx من كل الطلبات | Logs aggregation | > 1% لمدة 5 دقائق |
| **Database Connections** | عدد الاتصالات النشطة | PostgreSQL `pg_stat_activity` | > 80% من الحد الأقصى |
| **Database Size** | حجم القاعدة | `pg_database_size()` | > 10GB |
| **S3 Storage Used** | حجم التخزين | S3 metrics | > 50GB |
| **Memory Usage** | استهلاك الذاكرة لكل Container | Docker stats / Platform metrics | > 85% |
| **CPU Usage** | استهلاك المعالج | Docker stats / Platform metrics | > 80% لمدة 10 دقائق |
| **Disk Usage** | مساحة القرص | OS metrics | > 90% |
| **SSL Certificate** | تاريخ انتهاء الصلاحية | External check | < 14 يوم |
| **Uptime** | هل الموقع متاح | External uptime monitor | downtime > 1 دقيقة |

---

## 13. مصفوفة رؤوس الأمان (Security Headers Matrix)

> تُطبَّق على كل استجابة HTTP عبر Middleware (Next.js) أو Reverse Proxy (Nginx).

| الرأس | القيمة | الغرض | ملاحظات |
|---|---|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | إجبار HTTPS لمدة سنتين | يُضاف بعد أول redirect HTTP→HTTPS |
| `X-Content-Type-Options` | `nosniff` | منع المتصفح من تخمين نوع الملف | — |
| `X-Frame-Options` | `DENY` | منع تضمين الصفحة في iframe | يمنع Clickjacking |
| `X-XSS-Protection` | `0` | تعطيل XSS filter القديم في المتصفحات | يُفضل CSP بدلاً منه |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | التحكم في معلومات الـ Referrer | يسمح بالـ Referrer داخل نفس الموقع |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=()` | تعطيل ميزات المتصفح غير المستخدمة | — |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'nonce-{random}'; style-src 'self' 'unsafe-inline'; img-src 'self' https://*.amazonaws.com data:; font-src 'self'; connect-src 'self' https://api.insan-platform.com; frame-ancestors 'none';` | تقييد مصادر المحتوى | nonce يُولَّد لكل request |
| `X-DNS-Prefetch-Control` | `on` | تحسين أداء DNS lookup | — |

### CSP Configuration Notes

| Directive | القيمة | السبب |
|---|---|---|
| `default-src` | `'self'` | فقط مصادر الموقع نفسه |
| `script-src` | `'self' 'nonce-{random}'` | scripts مع nonce فقط — يمنع XSS |
| `style-src` | `'self' 'unsafe-inline'` | CSS inline مطلوب لـ Tailwind |
| `img-src` | `'self' https://*.amazonaws.com data:` | صور من S3 + inline data URIs |
| `font-src` | `'self'` | خطوط مُضمنة في Bundle |
| `connect-src` | `'self' https://api.insan-platform.com` | API calls فقط |
| `frame-ancestors` | `'none'` | لا أحد يمكنه تضمين موقعنا |

### CSP Reporting (اختياري — يُضاف عند النمو)

```
Content-Security-Policy-Report-Only: ... ; report-uri /csp-report
```

---

## 14. سياسة كلمات المرور والجلسات (Password & Session Security Policy)

### متطلبات كلمة المرور (Password Requirements)

| القاعدة | القيمة | التحقق |
|---|---|---|
| **الحد الأدنى للطول** | **8 أحرف** | class-validator: `@MinLength(8)` |
| **الحد الأقصى للطول** | **128 حرف** | class-validator: `@MaxLength(128)` |
| **يجب أن يحتوي على** | حرف كبير + حرف صغير + رقم | Regex: `^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$` |
| **لا يُسمح بـ** | كلمات المرور الشائعة (top 10000) | مكتبة `zxcvbn` أو قائمة ثابتة — تُرفض برسالة "كلمة المرور ضعيفة جداً" |
| **لا يُسمح بـ** | تكرار كلمات المرور السابقة | التحقق من `passwordHash` الأخير (آخر 5 كلمات محفوظة) |
| **التشفير** | **Argon2id** | `argon2.hash(password, { type: argon2.argon2id })` |

### إعدادات Argon2

| المعامل | القيمة |
|---|---|
| **Memory** | 65536 KB (64 MB) |
| **Iterations** | 3 |
| **Parallelism** | 4 |
| **Hash Length** | 32 |
| **Salt Length** | 16 |

### جلسات المستخدم (Session Management)

| الخاصية | القيمة |
|---|---|
| **Access Token Lifetime** | **15 دقيقة** |
| **Refresh Token Lifetime** | **7 أيام** |
| **Access Token Storage** | في الذاكرة فقط (Frontend state) — لا localStorage/cookies |
| **Refresh Token Storage** | `httpOnly`, `Secure`, `SameSite=Lax` cookie |
| **Token Rotation** | عند كل refresh: refresh token يُستبدل بـ token جديد (single-use) |
| **Multi-device** | مسموح — كل جهاز يملك refresh token مستقل |
| **Maximum Sessions** | **لا يوجد حد** — يمكن للمستخدم الدخول من أجهزة متعددة |

### قفل الحساب (Account Lockout)

| القاعدة | القيمة |
|---|---|
| **المحاولات الفاشلة قبل القفل** | **5 محاولات** |
| **مدة القفل** | **15 دقيقة** (تلقائي — ينتهي بعد المدة) |
| **المعرّف** | IP + Email معاً (ليس email فقط — لحماية من credential stuffing) |
| **إخطار المستخدم** | رسالة: "تم قفل الحساب مؤقتاً. يرجى المحاولة بعد {剩余时间}." |
| **إخطار الأدمن** | تسجيل `warn` في logs مع IP + email |
| **بعد انتهاء القفل** | عداد المحاولات يُصفَّر (reset) |

### إجراءات أمنية إضافية (Additional Security Measures)

| الإجراء | التفاصيل |
|---|---|
| **Password Reset Token** | صالح لمدة **30 دقيقة** فقط + single-use (يُبطل بعد الاستخدام) |
| **Password Reset Rate Limit** | **3 طلبات / ساعة / email** |
| **Email Verification** | غير مطلوب في MVP (المستخدم يُنشأ من الأدمن فقط) |
| **MFA (Multi-Factor Auth)** | **غير مُستخدَم في MVP** — البنية جاهزة لإضافته (Authenticator app أو SMS) |
| **Session Invalidation** | عند تغيير كلمة المرور → كل Refresh Tokens تُبطل |
| **Audit Logging** | كل login/logout/password reset يُسجَّل في AuditLog |
| **HTTPS Only** | كل الكوكيز تُرسَل عبر HTTPS فقط — لا HTTP في أي بيئة |

---

**التالي:** `../architecture/99_REPLIT_BUILD_GUIDE.md` — دليل التنفيذ الرئيسي لـ Replit Agent.
