# 05 — User Roles & Permissions (Replit Implementation)

# 05 — الأدوار والصلاحيات (User Roles & Permissions)

> **Document Version:** 1.1
> **Status:** Final
> **Last Updated:** 2025-07-16
> **Source of Truth:** Yes

> هذه الأدوار خاصة **بمستخدمي لوحة التحكم فقط** (فريق العمل الذي يدير المنصة من الباك إند) — وليست أدوار لزوار الموقع العام (الذين لا يحتاجون تسجيل دخول أصلاً حالياً). لتفاصيل شاشات لوحة التحكم والصلاحيات على كل شاشة، راجع [06 — Admin Dashboard Specification](../admin/06_ADMIN_DASHBOARD_SPECIFICATION.md). لتوثيق الـ API endpoints، راجع [04 — API Specification](../api/04_API_SPECIFICATION.md).

---

## 1. الأدوار المعتمدة

| الدور | الوصف | مثال استخدام |
|---|---|---|
| `SUPER_ADMIN` | تحكم كامل بدون استثناء، بما فيه إدارة المستخدمين/الأدوار والإعدادات الحساسة (Integrations) | صاحب المشروع / المدير التقني |
| `ADMIN` | تحكم كامل بالمحتوى والعمليات، بدون إدارة مستخدمين آخرين بدور Super Admin | مدير المنصة |
| `MANAGER` | مسؤول عن مراجعة ونشر المحتوى، وإدارة الحجوزات والتواصل | مدير تسويق/محتوى |
| `EDITOR` | إنشاء وتعديل المحتوى فقط (بدون نشر مباشر — يحتاج مراجعة Manager) | كاتب محتوى/مصمم |
| `VIEWER` | عرض فقط، بدون أي تعديل | عضو فريق للمتابعة فقط |

---

## 2. تخزين الصلاحيات

الصلاحيات مخزّنة كـ `Json` داخل جدول `Role` بالشكل:
```json
{
  "pages": ["view", "create", "edit", "publish", "delete"],
  "hospitals": ["view", "create", "edit", "publish", "delete"],
  "medical-centers": ["view", "create", "edit", "publish", "delete"],
  "doctors": ["view", "create", "edit", "publish", "delete"],
  "news": ["view", "create", "edit", "publish", "delete"],
  "media": ["view", "upload", "delete"],
  "appointments": ["view", "manage"],
  "contact": ["view", "manage"],
  "testimonials": ["view", "create", "edit", "delete"],
  "navigation": ["view", "edit"],
  "ai-chat": ["view", "manage"],
  "users": ["view", "manage"],
  "settings": ["view", "manage"],
  "audit": ["view"],
  "analytics": ["view"]
}
```
كل Guard في NestJS يتحقق: *"هل `permissions[module]` تحتوي على الفعل المطلوب؟"* قبل تنفيذ أي Endpoint إداري — هذا التحقق يحدث **دائماً في الـ API نفسه**، مش بس بإخفاء الزرار في الواجهة.

---

## 3. مصفوفة الصلاحيات الكاملة

| الوحدة (Module) | Action | SUPER_ADMIN | ADMIN | MANAGER | EDITOR | VIEWER |
|---|---|:---:|:---:|:---:|:---:|:---:|
| Pages | view/create/edit | ✅ | ✅ | ✅ | ✅ | 👁 view فقط |
| Pages | publish/delete | ✅ | ✅ | ✅ | ❌ | ❌ |
| Hospitals | view/create/edit | ✅ | ✅ | ✅ | ✅ | 👁 |
| Hospitals | publish/delete | ✅ | ✅ | ✅ | ❌ | ❌ |
| Medical Centers | view/create/edit | ✅ | ✅ | ✅ | ✅ | 👁 |
| Medical Centers | publish/delete | ✅ | ✅ | ✅ | ❌ | ❌ |
| Doctors / Clinics | view/create/edit | ✅ | ✅ | ✅ | ✅ | 👁 |
| Doctors / Clinics | publish/delete | ✅ | ✅ | ✅ | ❌ | ❌ |
| News (يدوي) | view/create/edit | ✅ | ✅ | ✅ | ✅ | 👁 |
| News (يدوي) | publish/delete | ✅ | ✅ | ✅ | ❌ | ❌ |
| News (Social Sync review) | review/publish | ✅ | ✅ | ✅ | ❌ | ❌ |
| Media Library | view/upload | ✅ | ✅ | ✅ | ✅ | 👁 |
| Media Library | delete | ✅ | ✅ | ✅ | ❌ | ❌ |
| Testimonials | كل الأفعال | ✅ | ✅ | ✅ | 👁 | 👁 |
| Navigation/Footer | view/edit | ✅ | ✅ | ✅ | 👁 | 👁 |
| Appointments/Leads | view/manage status | ✅ | ✅ | ✅ | 👁 | 👁 |
| Contact Submissions | view/manage | ✅ | ✅ | ✅ | 👁 | 👁 |
| AI Chat — Knowledge Base | view/manage | ✅ | ✅ | ✅ | ✅ (بدون تعطيل الميزة كلياً) | 👁 |
| AI Chat — Settings/Conversations | view/manage | ✅ | ✅ | 👁 | ❌ | ❌ |
| Users & Roles | إدارة كاملة | ✅ | ✅ (بدون إنشاء Super Admin) | ❌ | ❌ | ❌ |
| Settings (عام/Brand/SEO/Languages) | view/manage | ✅ | ✅ | 👁 | ❌ | ❌ |
| Settings — Integrations (توكنز حساسة) | view/manage | ✅ | ✅ | ❌ | ❌ | ❌ |
| Audit Log | view | ✅ | ✅ | 👁 (خاص بفريقه) | ❌ | ❌ |
| Analytics Dashboard | view | ✅ | ✅ | ✅ | ✅ | ✅ |

**✅** = صلاحية كاملة · **👁** = عرض فقط (View) · **❌** = بدون وصول

---

## 4. قواعد إضافية مهمة

- **قاعدة "لا يمكن لدور إنشاء دور أعلى منه":** فقط `SUPER_ADMIN` يقدر ينشئ مستخدم بدور `SUPER_ADMIN`. `ADMIN` يقدر ينشئ حتى `MANAGER`.
- **قاعدة "المحتوى المُنشأ من Editor يحتاج مراجعة":** أي صفحة/خبر ينشئه `EDITOR` يبقى بحالة `DRAFT` ولا يظهر للعامة إلا بعد أن يضغط `MANAGER` فأعلى زر Publish (خطوة موثّقة بالتفصيل في [09 — Workflows](../architecture/09_WORKFLOWS.md)).
- **قاعدة الصلاحيات الحساسة (Integrations/Users):** مقصورة عمداً على `ADMIN`/`SUPER_ADMIN` لأنها تتحكم في مفاتيح خارجية (توكنز سوشيال ميديا، Analytics) وبيانات حسّاسة.
- **صلاحية `pages:manage-hidden` (خاصة بصفحة Investors):** صلاحية إضافية منفصلة عن `pages:edit` العادية، تُمنح فقط لمن يحق له رؤية/تعديل الصفحات المخفية.
- **التوسع المستقبلي:** إضافة دور جديد (مثال: `SUPPORT_AGENT` لإدارة الشات فقط) = سطر جديد في enum `RoleName` + كائن Permissions جديد، بدون تعديل منطق الـ Guards نفسه.

---

**التالي:** [06 — Admin Dashboard Specification](../admin/06_ADMIN_DASHBOARD_SPECIFICATION.md) — تصميم لوحة التحكم شاشة بشاشة.