# 14 — UI Screen Specification (مواصفة شاشات الواجهة)

> **Document Version:** 1.1
> **Status:** Final
> **Last Updated:** 2025-07-16
> **Source of Truth:** Yes

> **Purpose:** Detailed screen-level specifications for every view in the platform — public and admin. This document defines screen hierarchy, layout structure, responsive behavior, navigation, component placement, and interaction notes for every implementable screen.
>
> **Cross-references:**
> - `../architecture/02_INFORMATION_ARCHITECTURE_AND_PAGES.md` — page-level specs (content, SEO, editable fields)
> - `../admin/06_ADMIN_DASHBOARD_SPECIFICATION.md` — admin screen functional specs
> - `07_UI_COMPONENT_INVENTORY.md` — component list
> - `15_COMPONENT_SPECIFICATION.md` — component-level props/states/events
> - `08_DESIGN_SYSTEM.md` — visual tokens (colors, spacing, typography)
> - `../state/11_STATE_MANAGEMENT.md` — data fetching strategy per screen

---

## Global Layout (Every Page)

### Screen Hierarchy

```
RootLayout
├── Header (sticky, z-50)
│   ├── Logo (links to /{locale})
│   ├── MainNavigation (desktop: horizontal; mobile: hamburger)
│   ├── LanguageSwitcher
│   └── SearchIcon (optional)
├── MainContent
│   └── [Page Content]
├── StickyActionsBar (global, always visible)
│   ├── EmergencyButton
│   ├── BookAppointmentButton
│   └── WhatsAppButton
├── ChatWidget (global, always visible)
└── Footer (global)
```

### Global Layout Behavior

| Element | Desktop (≥1024px) | Tablet (768–1023px) | Mobile (<768px) |
|---|---|---|---|
| **Header** | Fixed top, full width, white bg, shadow on scroll | Same as desktop | Logo + hamburger + language icon only |
| **MainNavigation** | Horizontal inline in header | Hamburger menu | Hamburger menu (full-screen overlay) |
| **StickyActionsBar** | Floating right side, 3 vertical buttons | Same as desktop | Fixed bottom bar, 3 horizontal buttons |
| **ChatWidget** | Floating bottom-right bubble | Same as desktop | Full-width bottom sheet when open |
| **Footer** | 4-column grid | 2-column grid | Single column, accordion sections |

### Global Navigation Flow

```
Header Logo → /{locale} (Home)
Header Nav Items → /{locale}/{route}
Language Switcher → Same page in alternate locale
Footer Links → NavigationItem (location=footer) from DB
StickyActionsBar → Emergency (tel:), Book (opens AppointmentDrawer), WhatsApp (wa.me/)
ChatWidget → Opens floating chat panel
```

---

## PUBLIC SCREENS

### P-01: Home Page

**File:** `app/[locale]/(public)/page.tsx`
**See also:** `../architecture/02_INFORMATION_ARCHITECTURE_AND_PAGES.md` §1, `15_COMPONENT_SPECIFICATION.md` (Hero, FeatureGrid, EntityCards, ServiceCards, TeamGrid, StepsTimeline, NewsGrid, ContactBlock)

#### Layout Structure
```
┌─────────────────────────────────────────┐
│                Hero                      │
│  (title, subtitle, bg image/video,      │
│   2 CTA buttons)                         │
├─────────────────────────────────────────┤
│            FeatureGrid                   │
│  ("Why Choose INSAN" — 4-column grid)   │
├─────────────────────────────────────────┤
│            EntityCards                   │
│  ("Our Hospitals" — hospital cards)     │
├─────────────────────────────────────────┤
│           ServiceCards                   │
│  ("Our Medical Centers" — featured)     │
├─────────────────────────────────────────┤
│             TeamGrid                     │
│  ("Our Doctors" — featured doctors)     │
├─────────────────────────────────────────┤
│          StepsTimeline                   │
│  ("Patient Journey" — horizontal steps) │
├─────────────────────────────────────────┤
│            NewsGrid                      │
│  ("Latest News" — 3 latest posts)       │
├─────────────────────────────────────────┤
│           ContactBlock                   │
│  (contact info + map)                    │
└─────────────────────────────────────────┘
```

#### Desktop (≥1024px)
- Hero: full-width background image, text overlay left-aligned, max-width 1280px container
- FeatureGrid: 4 columns, gap 24px
- EntityCards: 3 columns (or 2 if only 2 hospitals), gap 24px
- ServiceCards: 4 columns for featured centers, gap 24px
- TeamGrid: 4 columns, gap 16px
- StepsTimeline: horizontal layout, icons above text
- NewsGrid: 3 columns, gap 24px
- ContactBlock: 2 columns (form left, map right)

#### Tablet (768–1023px)
- Hero: same but smaller heading (H2 size)
- FeatureGrid: 2 columns
- EntityCards: 2 columns
- ServiceCards: 2 columns
- TeamGrid: 2 columns
- StepsTimeline: horizontal, smaller icons
- NewsGrid: 2 columns
- ContactBlock: stacked (map below form)

#### Mobile (<768px)
- Hero: text over image, full width, CTA buttons stacked vertically
- FeatureGrid: 1 column
- EntityCards: horizontal scroll carousel, one card visible at a time
- ServiceCards: 1 column
- TeamGrid: horizontal scroll carousel
- StepsTimeline: vertical layout, icons left of text
- NewsGrid: 1 column
- ContactBlock: stacked, map full width below form

#### Component Placement
| Section | Component | Data Source |
|---|---|---|
| Hero | `Hero` | `Page.sections[0].config` |
| FeatureGrid | `FeatureGrid` | `Page.sections[1].config.features` |
| Hospitals | `EntityCards` | `GET /hospitals?status=PUBLISHED` |
| Centers | `ServiceCards` | `GET /medical-centers?isFeatured=true` |
| Doctors | `TeamGrid` | `GET /doctors?isFeatured=true` |
| Journey | `StepsTimeline` | `Page.sections[5].config.steps` |
| News | `NewsGrid` | `GET /news?limit=3&status=PUBLISHED` |
| Contact | `ContactBlock` | `GET /settings/public` (group=general) |

---

### P-02: About INSAN

**File:** `app/[locale]/(public)/about/page.tsx`
**See also:** `../architecture/02_INFORMATION_ARCHITECTURE_AND_PAGES.md` §2

#### Layout Structure
```
Hero (different headline) → RichTextBlock → FeatureGrid (values) →
StatisticsBlock → TestimonialsCarousel → CTA → Footer
```

#### Responsive Rules
| Section | Desktop | Tablet | Mobile |
|---|---|---|---|
| StatisticsBlock | 4 columns | 2 columns | 1 column |
| TestimonialsCarousel | 2-3 cards visible | 1-2 cards | 1 card |
| RichTextBlock | max-width 800px, centered | Same | Full width |

---

### P-03: Hospitals List

**File:** `app/[locale]/(public)/hospitals/page.tsx`
**See also:** `../architecture/02_INFORMATION_ARCHITECTURE_AND_PAGES.md` §3

#### Layout Structure
```
Hero (simple) → EntityCards (full grid of all published hospitals) → CTA → Footer
```

#### Responsive Rules
| Section | Desktop | Tablet | Mobile |
|---|---|---|---|
| EntityCards | 2 columns, gap 24px | 2 columns | 1 column, full-width images |

---

### P-04: Hospital Detail

**File:** `app/[locale]/(public)/hospitals/[slug]/page.tsx`
**See also:** `../architecture/02_INFORMATION_ARCHITECTURE_AND_PAGES.md` §4

#### Layout Structure
```
Hero (hospital brand_color as accent) → RichTextBlock →
ServiceCards (medical centers for THIS hospital only) →
TeamGrid (doctors for THIS hospital) →
ScheduleTable (aggregated from clinics) →
NewsGrid (news with related_hospital_id = this) →
Gallery → ContactBlock → Footer
```

#### Responsive Rules
| Section | Desktop | Tablet | Mobile |
|---|---|---|---|
| Hero | Side-by-side (image + text) | Same | Text over image |
| ScheduleTable | Full table | Table with horizontal scroll | Accordion (collapsible cards) |
| ServiceCards | 2-3 columns | 2 columns | 1 column |

---

### P-05: Medical Centers List

**File:** `app/[locale]/(public)/medical-centers/page.tsx`
**See also:** `../architecture/02_INFORMATION_ARCHITECTURE_AND_PAGES.md` §5

#### Layout Structure
```
Hero → FilterBar (by hospital: All/Future/Delta) →
ServiceCards Grid → CTA → Footer
```

#### Responsive Rules
| Section | Desktop | Tablet | Mobile |
|---|---|---|---|
| FilterBar | Horizontal buttons | Horizontal buttons | Dropdown select |
| ServiceCards | 4 columns | 2 columns | 1 column |

---

### P-06: Medical Center Detail

**File:** `app/[locale]/(public)/medical-centers/[slug]/page.tsx`
**See also:** `../architecture/02_INFORMATION_ARCHITECTURE_AND_PAGES.md` §6

#### Layout Structure
```
Hero → FeatureGrid (center features) → ServicesList →
ClinicsScheduleTable → TeamGrid →
HostedByBlock (which hospital(s)) → CTA → Footer
```

#### Responsive Rules
Same as Hospital Detail (P-04).

---

### P-07: Doctors Directory

**File:** `app/[locale]/(public)/doctors/page.tsx`
**See also:** `../architecture/02_INFORMATION_ARCHITECTURE_AND_PAGES.md` §7

#### Layout Structure
```
Hero (simple) → FilterBar (hospital/center/specialty multi-select) →
SearchInput → TeamGrid (paginated) → Footer
```

#### Responsive Rules
| Section | Desktop | Tablet | Mobile |
|---|---|---|---|
| FilterBar | Horizontal bar | Horizontal bar | Drawer (slide from left) |
| SearchInput | Full width in filter bar | Same | Full width below filter button |
| TeamGrid | 4 columns | 2 columns | 1 column |

#### Interaction Notes
- SearchInput: debounce 300ms, minimum 2 characters before query fires
- FilterBar: active filters shown as removable chips below the bar
- Pagination: 12 items per page, Prev/Next on mobile, page numbers on desktop

---

### P-08: Doctor Detail

**File:** `app/[locale]/(public)/doctors/[slug]/page.tsx`
**See also:** `../architecture/02_INFORMATION_ARCHITECTURE_AND_PAGES.md` §8

#### Layout Structure
```
DoctorProfileHeader (image, name, specialty, affiliations) →
RichTextBlock (bio) → ScheduleTable →
CTA (book with this doctor) → RelatedDoctors → Footer
```

#### Responsive Rules
| Section | Desktop | Tablet | Mobile |
|---|---|---|---|
| DoctorProfileHeader | Horizontal (image left, info right) | Same | Stacked (image top, info below) |

---

### P-09: News List

**File:** `app/[locale]/(public)/news/page.tsx`
**See also:** `../architecture/02_INFORMATION_ARCHITECTURE_AND_PAGES.md` §9

#### Layout Structure
```
Hero → FilterBar (by category, by source entity) →
NewsGrid (paginated, 12 per page) → Footer
```

#### Responsive Rules
| Section | Desktop | Tablet | Mobile |
|---|---|---|---|
| NewsGrid | 3 columns | 2 columns | 1 column |

---

### P-10: News Post Detail

**File:** `app/[locale]/(public)/news/[slug]/page.tsx`
**See also:** `../architecture/02_INFORMATION_ARCHITECTURE_AND_PAGES.md` §10

#### Layout Structure
```
ArticleHeader (title, image, date, category, social badge if synced) →
ArticleBody (rich text) → ShareButtons → RelatedNews → Footer
```

#### Responsive Rules
- ArticleBody: max-width 720px for comfortable reading on all screens
- ShareButtons: horizontal on desktop, vertical on mobile

---

### P-11: Contact Us

**File:** `app/[locale]/(public)/contact/page.tsx`
**See also:** `../architecture/02_INFORMATION_ARCHITECTURE_AND_PAGES.md` §11

#### Layout Structure
```
Hero → ContactForm + MapBlock (side by side) → ContactInfoBlock → Footer
```

#### Responsive Rules
| Section | Desktop | Tablet | Mobile |
|---|---|---|---|
| ContactForm + MapBlock | 2 columns (form 50%, map 50%) | 2 columns | Stacked (form top, map full-width bottom) |

---

### P-12: Investor Page (Hidden)

**File:** `app/[locale]/(public)/investors/page.tsx`
**See also:** `../architecture/02_INFORMATION_ARCHITECTURE_AND_PAGES.md` §13

- **No navigation link.** Direct URL only.
- `robots: noindex, nofollow` enforced at page level.
- Excluded from `sitemap.xml`.
- Same layout as a standard page (Hero → RichTextBlock → DownloadableFile → ContactForm).

---

### P-13: Privacy Policy / Terms of Use

**Files:** `app/[locale]/(public)/privacy/page.tsx`, `app/[locale]/(public)/terms/page.tsx`
**See also:** `../architecture/02_INFORMATION_ARCHITECTURE_AND_PAGES.md` §14

- Simple layout: Hero (minimal) → RichTextBlock (long-form text)
- max-width 800px, centered for readability
- Footer links only

---

### P-14: 404 Error Page

**File:** `app/[locale]/not-found.tsx`
**See also:** `../architecture/02_INFORMATION_ARCHITECTURE_AND_PAGES.md` §15

- Centered content: error message + illustration + "Return Home" button + optional SearchInput
- `robots: noindex`, HTTP 404 status code
- Text from Settings > General > Error Page

---

## GLOBAL COMPONENTS (Persistent on Every Page)

### G-01: StickyActionsBar

**File:** `components/features/StickyActionsBar.tsx`
**See also:** `15_COMPONENT_SPECIFICATION.md` (StickyActionsBar)

| Desktop | Mobile |
|---|---|
| Fixed right side, vertical stack of 3 circular buttons | Fixed bottom bar, horizontal row of 3 buttons |
| Icons: Phone (emergency), Calendar (book), WhatsApp | Same icons, larger touch targets |
| Expand on hover to show label | Always show labels |

### G-02: ChatWidget

**File:** `components/features/ChatWidget.tsx`
**See also:** `15_COMPONENT_SPECIFICATION.md` (ChatWidget)

| Desktop | Mobile |
|---|---|
| Floating bottom-right, 400px wide panel | Full-screen overlay when open |
| Bubble (closed) → Panel (open) | Bubble → Full screen |
| Typing indicator, suggested actions | Same |

### G-03: Header

**File:** `components/blocks/Header.tsx`
**See also:** `15_COMPONENT_SPECIFICATION.md` (Header)

| Desktop | Tablet | Mobile |
|---|---|---|
| Horizontal nav items inline | Hamburger menu | Hamburger menu |
| Logo left, nav center, language right | Logo left, hamburger + language right | Logo left, hamburger + language right |
| Background: white, shadow appears on scroll | Same | Same |

### G-04: Footer

**File:** `components/blocks/Footer.tsx`
**See also:** `15_COMPONENT_SPECIFICATION.md` (Footer)

| Desktop | Tablet | Mobile |
|---|---|---|
| 4-column grid (About, Quick Links, Services, Contact) | 2-column grid | Single column, accordion sections |

### G-05: Breadcrumb

**File:** `components/ui/Breadcrumb.tsx`

| Desktop | Mobile |
|---|---|
| Full breadcrumb path | Truncated to last 2 items with "..." |

---

## ADMIN SCREENS

### A-01: Login

**File:** `app/[locale]/(admin)/login/page.tsx`
**See also:** `../admin/06_ADMIN_DASHBOARD_SPECIFICATION.md` §1

#### Layout Structure
```
Centered card (max-width 400px):
  Logo
  Email input
  Password input
  "Forgot Password?" link
  Login button
```

- No sidebar, no header
- Error message: generic "Invalid credentials" (security)
- Lockout after 5 failed attempts (shows remaining attempts)

---

### A-02: Dashboard Overview

**File:** `app/[locale]/(admin)/dashboard/page.tsx`
**See also:** `../admin/06_ADMIN_DASHBOARD_SPECIFICATION.md` §2

#### Layout Structure
```
┌─────────────────────────────────────────────┐
│ Sidebar │  Stats Cards (4-5 across)          │
│         ├─────────────────────────────────────┤
│         │  Chart (Appointments last 30 days)  │
│         ├─────────────────────────────────────┤
│         │  Recent Appointments | Recent Contact│
│         ├─────────────────────────────────────┤
│         │  Recent Activity (Audit Log)         │
└─────────────────────────────────────────────┘
```

| Desktop | Tablet | Mobile |
|---|---|---|
| Sidebar + content (full width) | Collapsed sidebar + content | No sidebar (hamburger opens drawer) + stacked cards |

---

### A-03 through A-16: Admin CRUD Screens

All admin list screens follow this pattern:

```
┌─────────────────────────────────────────────┐
│ Sidebar │  Page Title + "New" Button          │
│         ├─────────────────────────────────────┤
│         │  Filters Bar                         │
│         ├─────────────────────────────────────┤
│         │  DataTable                           │
│         │  (columns, rows, pagination,         │
│         │   bulk actions, inline actions)      │
│         └─────────────────────────────────────┘
```

All admin form screens follow this pattern:

```
┌─────────────────────────────────────────────┐
│ Sidebar │  Page Title + Back + Save/Publish    │
│         ├─────────────────────────────────────┤
│         │  Tabs (if applicable)                │
│         ├─────────────────────────────────────┤
│         │  Form Fields                         │
│         │  (bilingual tabs for text fields)    │
│         └─────────────────────────────────────┘
```

**See `../admin/06_ADMIN_DASHBOARD_SPECIFICATION.md` for complete per-screen specs.**

| Screen | Key Responsive Behavior |
|---|---|
| Pages (Page Builder) | Drag disabled on mobile, replaced with up/down buttons |
| Media Library | Grid view on all sizes, folder tree becomes dropdown on mobile |
| Appointments | Table → Card list on mobile |
| Audit Log | Table → Card list on mobile, Diff viewer stacks vertically |
| Users & Roles | Table → Card list on mobile |

---

## Responsive Breakpoint Reference

| Name | Width | Columns | Gutter | Notes |
|---|---|---|---|---|
| Mobile | < 768px | 4 | 16px | Single column layouts, hamburger nav |
| Tablet | 768–1023px | 8 | 24px | Two-column where applicable |
| Desktop | 1024–1439px | 12 | 24px | Full layout |
| Wide | ≥ 1440px | 12 | 24px | Max-width 1280px centered |

**See `08_DESIGN_SYSTEM.md` §4 for complete breakpoint/grid specifications.**

---

## Touch Target Minimum Sizes

| Element | Minimum Size | Reference |
|---|---|---|
| Buttons | 44px × 44px | WCAG 2.5.5 |
| Links in navigation | 44px × 44px | WCAG 2.5.5 |
| Form inputs | 44px height | `08_DESIGN_SYSTEM.md` §8 |
| ChatWidget bubble | 48px × 48px | — |
| StickyActionsBar buttons | 48px × 48px | — |
| Filter chips | 36px height | — |
| Pagination buttons | 40px × 40px | — |

---

## Responsive Priority Rules (Collapsing Order)

### المبدأ

عند تقليل عرض الشاشة، تُستبعَد العناصر بترتيب واضح ومتوقع — **الأساسي أولاً، الثانوي يختفي أولاً**.

### ترتيب الانكماش حسب Breakpoint

| الأولوية | العنصر | Desktop | Tablet | Mobile | سبب الاستبعاد |
|---|---|---|---|---|---|
| **1 (تختفي أولاً)** | Breadcrumbs | ظاهر | ظاهر | **مخفية** | مساحة شاشة محدودة؛ التنقل عبر Header كافي |
| **2** | Sidebar Filters (Admin) | جانبي ثابت | **Drawer** (يُفتح بالزر) | **Drawer** | لا يكفي المساحة جانباً |
| **3** | Table Columns (Admin) | كل الأعمدة | **أعمدة أقل** (الأولوية: الاسم + الحالة + الإجراءات) | **Cards** (الجدول يتحول لبطاقات) | الأعمدة لا تتسع |
| **4** | Footer Columns | 4 أعمدة | 2 عمود | **عمود واحد + Accordion** | — |
| **5** | Hero Text Size | 48px | 36px | 32px | الخط يصغر قبل أن يُستبعَد |
| **6** | Secondary Navigation (Tab bar) | ظاهر | ظاهر | **Dropdown** (يتحول لقائمة منسدلة) | لا تتسع التبويبات أفقياً |
| **7** | Statistics Block | 4 أعمدة | 2 عمود | **Carousel أفقي** | — |
| **8** | Sidebar Related Content | جانبي | **أسفل المحتوى** | **أسفل المحتوى** | — |
| **9 (تبقى دائماً)** | Header Logo + Hamburger | ظاهر | ظاهر | ظاهر | أساسي للتنقل |
| **9** | StickyActionsBar | ظاهر | ظاهر | ظاهر (يسفلي) | أساسي (طوارئ/موعد/واتساب) |
| **9** | ChatWidget | ظاهر | ظاهر | ظاهر (sheet) | أساسي |

### قواعد عامة

| القاعدة | التفاصيل |
|---|---|
| **العرض لا يقل عن 320px** | لا يوجد تصميم لأقل من 320px — هذا الحد الأدنى المطلق |
| **لا عنصر يختفي قبل Tablet (<768px)** | على Tablet (768–1023px) تُخفَّف الأعمدة لكن لا يُستبعَد أي عنصر أساسي |
| **التحول يحصل عند breakpoint واحد** | لا تدرّجية — العنصر إما ظاهر أو متحول (Drawer/Dropdown) |
| **الجدول → بطاقات عند Mobile** | كل DataTable يتحول لتصميم Card-based على Mobile — لا جدول أفقي بالتمرير |
| **الصور تصغر دائماً قبل النصوص** | Hero images: 100% → 80% width → تُستبعَد كخلفية (تصبح ثابتة أعلى الصفحة) |
| **Z-indexConsistency** | Header=50, StickyActionsBar=40, ChatWidget=30, Modal=100, Toast=110 |

### تحويلات Mobile الشائعة

| العنصر | Desktop | Mobile |
|---|---|---|
| **Navigation** | Horizontal menu | Hamburger → Full-screen overlay |
| **Filters** | Sidebar (left/right) | Slide-in Drawer من اليمين (AR) / اليسار (EN) |
| **DataTable** | Full table with columns | Stack of Cards (اسم + حالة + إجراءات) |
| **Footer** | 4-column grid | Single column + accordion sections |
| **Tabs** | Horizontal tab bar | Dropdown select |
| **StickyActionsBar** | Vertical floating (right) | Horizontal fixed (bottom) |
| **ChatWidget** | Floating bubble (bottom-right) | Full-width bottom sheet |
| **Image Gallery** | Grid (2-3 columns) | Single column + swipe |
| **Statistics** | 4-column grid | Horizontal carousel |
