# 11 — State Management (Replit Implementation)

> **Document Version:** 1.1
> **Status:** Final
> **Last Updated:** 2025-07-16
> **Source of Truth:** Yes

> **Default to React Server Components** unless the component needs `useState`, `useEffect`, `onClick`, or other client-side interactivity.

---

## 1. Server State (بيانات قادمة من الـ API)

**الاختيار:** TanStack Query (React Query) في كل من الموقع العام (حيث يوجد تفاعل — فلاتر، بحث) ولوحة التحكم (كل الشاشات تقريباً).

**لماذا:** يفصل بيانات السيرفر عن حالة الواجهة تماماً، يدير الكاش والـ Loading/Error states تلقائياً، ويمنع أخطاء شائعة (طلبات مكررة، بيانات قديمة بعد التعديل).

**الاستراتيجية:**
- **الموقع العام:** الصفحات الأساسية (Home, Hospital Detail...) تُجلَب بياناتها في **React Server Components** مباشرة وقت الطلب (SSR/SSG/ISR) لصالح SEO والأداء — React Query يُستخدم فقط للتفاعلات اللاحقة على نفس الصفحة (فلترة الأطباء، البحث، تحميل المزيد).
- **لوحة التحكم:** كل شيء Client-side عبر React Query (الجداول، النماذج، القوائم المنسدلة) لأنها تحتاج تفاعلية كاملة (فلترة فورية، تعديل بدون إعادة تحميل الصفحة).
- **`staleTime`:** 60 ثانية للبيانات العامة شبه الثابتة (قوائم المستشفيات/المراكز)، 0 للبيانات شديدة التغيّر (الحجوزات الجديدة، المحادثات).
- **Invalidation:** أي `mutation` ناجحة (Create/Update/Delete) تُبطل تلقائياً الكاش المرتبط (`queryClient.invalidateQueries(['hospitals'])`) فتُحدَّث الجداول فوراً.
- **Optimistic Updates:** تُستخدم فقط للعمليات الآمنة عالية التكرار (مثال: إعادة ترتيب Sections بالسحب، تبديل حالة إظهار/إخفاء) لإحساس فوري بالاستجابة، مع Rollback تلقائي لو فشل الطلب فعلياً.

---

## 2. Client State (حالة الواجهة فقط، لا تحتاج سيرفر)

**الاختيار:** Zustand (خفيف، بسيط، بدون Boilerplate زيادة) + `useState`/`useReducer` المحلي للحالات البسيطة جداً داخل مكوّن واحد.

**أمثلة على Client State:**
- فتح/إغلاق `ChatWidget`
- طي/فرد الـ Sidebar بلوحة التحكم
- قيم الفلاتر **قبل** الضغط على "بحث" (بعدها تتحول لـ Server State عبر React Query)
- اللغة الحالية المختارة (يُقرأ أساساً من الـ URL locale، لكن يُخزَّن أيضاً كتفضيل محلي للـ LanguageSwitcher)
- خطوات نموذج الحجز متعدد المراحل (Multi-step form state)

**لماذا ليس Redux:** المشروع لا يحتاج التعقيد الإضافي لـ Redux — الغالبية العظمى من البيانات هي Server State (تُدار بـ React Query أصلاً)، والـ Client State المتبقي بسيط ومحدود النطاق.

---

## 3. Authentication State

- `accessToken`: يُخزَّن **في الذاكرة فقط** (React Context/Zustand store)، **ليس** في `localStorage` أو `sessionStorage` — حماية من هجمات XSS.
- `refreshToken`: `httpOnly Secure Cookie` لا يمكن لجافاسكريبت الوصول له إطلاقاً.
- عند إعادة تحميل الصفحة (Refresh كامل للمتصفح): الـ `accessToken` يُفقَد من الذاكرة تلقائياً، فيُستدعى `POST /auth/refresh` فوراً عند تحميل التطبيق للحصول على واحد جديد بصمت (Silent refresh) بالاعتماد على الـ Cookie — تجربة سلسة بدون طلب تسجيل دخول متكرر.
- `middleware.ts` في Next.js يتحقق من وجود جلسة صالحة قبل السماح بدخول أي مسار `/admin/*`.

---

## 4. استراتيجية الجلب (Data Fetching Strategy)

| نوع الصفحة | الطريقة | السبب |
|---|---|---|
| صفحات عامة ثابتة نسبياً (Home, About, Hospital/Center Detail) | SSG + ISR (revalidate كل 60 ثانية إلى ساعة حسب النوع) | أفضل أداء وSEO، مع تحديث تلقائي دوري بدون Rebuild يدوي |
| صفحات عامة بفلاتر تفاعلية (Doctors, News List) | SSR أولي + React Query للتفاعل اللاحق | أول تحميل سريع ومفهرس، ثم تفاعل فوري بدون إعادة تحميل |
| نماذج عامة (Contact, Appointment) | Client-side mutation مباشرة (React Query `useMutation`) | لا حاجة لـ SEO هنا، الأولوية للتجاوب الفوري |
| كل لوحة التحكم | Client-side بالكامل عبر React Query | تفاعلية كاملة، غير مفهرسة لمحركات البحث أصلاً |
| ChatWidget | Client-side مباشر لكل رسالة | محادثة حيّة، لا تحتاج SSR |

---

## 5. معالجة الأخطاء (Error Handling)

- **مستوى الـ API:** كل خطأ يرجع بصيغة موحّدة (راجع `../api/04_API_SPECIFICATION.md` قسم الأخطاء).
- **مستوى React Query:** `onError` مركزي يحوّل أي خطأ 401 لصفحة تسجيل الدخول تلقائياً، وأي خطأ آخر يظهر كـ `Toast` بالرسالة المناسبة (مترجمة AR/EN من كود الخطأ).
- **Error Boundary عام:** يلتقط أي خطأ غير متوقع بالواجهة (Runtime error) ويعرض صفحة "حدث خطأ ما" هادئة بدل شاشة بيضاء، مع زر "إعادة المحاولة".
- **فاليديشن النماذج:** يحدث محلياً أولاً (فوري، بدون طلب سيرفر) لأخطاء بسيطة (حقل فارغ، صيغة بريد)، ثم يُتحقق منه مرة أخرى وجوباً في الـ Backend (لا يُعتمد على فاليديشن الواجهة فقط لأسباب أمنية).

---

## 6. Form State

**Tool:** React Hook Form + Zod.

**Strategy:**
- All forms (public and admin) use React Hook Form for performance (uncontrolled inputs where possible).
- Zod schemas define validation rules used on both client (UI validation) and server (API validation via class-validator DTOs derived from the same schema).
- Client-side validation provides instant feedback. Server-side validation is the authoritative check — never trust client validation alone.

---

**التالي:** `../deployment/12_DEPLOYMENT.md`
