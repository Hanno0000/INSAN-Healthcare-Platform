# 15 — Component Specification (مواصفة المكونات)

> **Document Version:** 1.1
> **Status:** Final
> **Last Updated:** 2025-07-16
> **Source of Truth:** Yes

> **Purpose:** Complete specification for every reusable component in the platform — including props, editable fields, validation, events, states, responsive behavior, accessibility, and developer implementation notes.
>
> **Cross-references:**
> - `07_UI_COMPONENT_INVENTORY.md` — component list with summary
> - `08_DESIGN_SYSTEM.md` — visual tokens, spacing, colors, typography
> - `14_UI_SCREEN_SPECIFICATION.md` — where each component is placed on screen
> - `../state/11_STATE_MANAGEMENT.md` — data fetching strategy (RSC vs client)
> - `../database/03_DATABASE_SCHEMA.md` — data models behind components

---

## Component Organization

```
components/
├── ui/           # Base elements: Button, Input, Modal, Toast, Badge, Pagination, Breadcrumb
├── blocks/       # Layout sections: Hero, Footer, Header, ContactBlock, RichTextBlock
├── features/     # Domain-specific: HospitalCard, DoctorCard, NewsCard, ChatWidget, StickyActionsBar
└── admin/        # Admin-only: DataTable, PageBuilderCanvas, FormBuilderField, SidebarNavigation
```

**Naming convention:** PascalCase filenames matching the export name. One component per file.

---

## UI Components (`components/ui/`)

### Button

| Property | Type | Default | Description |
|---|---|---|---|
| `variant` | `'primary' \| 'secondary' \| 'ghost' \| 'danger'` | `'primary'` | Visual style |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Button size |
| `isLoading` | `boolean` | `false` | Shows spinner, disables interaction |
| `disabled` | `boolean` | `false` | Visually dimmed + disabled |
| `leftIcon` | `ReactNode` | — | Icon before label |
| `rightIcon` | `ReactNode` | — | Icon after label |
| `children` | `ReactNode` | required | Button label |
| `onClick` | `() => void` | — | Click handler |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | HTML type |

**States:** Default → Hover (darken 8%) → Active (darken 12%) → Disabled (opacity 40%) → Loading (spinner)
**Responsive:** Same on all sizes. Min touch target 44px.
**Accessibility:** `role="button"`, `aria-disabled` when disabled, `aria-busy` when loading, visible `focus-visible` ring (2px Accent Blue).
**Implementation:** Use Tailwind classes matching `08_DESIGN_SYSTEM.md` §7. Wrap in `<button>` — never `<div>`.

---

### Input

| Property | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | required | Visible label (also used for `aria-label`) |
| `name` | `string` | required | Form field name |
| `type` | `'text' \| 'email' \| 'password' \| 'number' \| 'tel' \| 'url'` | `'text'` | HTML input type |
| `placeholder` | `string` | — | Placeholder text |
| `error` | `string \| undefined` | — | Error message displayed below |
| `required` | `boolean` | `false` | Adds `*` to label + validation |
| `disabled` | `boolean` | `false` | Non-interactive state |
| `value` | `string` | — | Controlled value |
| `onChange` | `(e) => void` | — | Change handler |
| `maxLength` | `number` | — | Max character count |
| `dir` | `'rtl' \| 'ltr'` | auto | Text direction (auto-detected from locale) |

**States:** Default → Focus (Accent Blue border) → Error (Error color border + message) → Disabled (gray bg)
**Responsive:** Full width on all sizes. Height 44px (touch-friendly).
**Accessibility:** `label` associated via `htmlFor`/`id`. Error linked via `aria-describedby`. Required fields marked with `aria-required`.
**Implementation:** Register with React Hook Form via `register()`. Validation via Zod schema.

---

### Textarea

| Property | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | required | Visible label |
| `name` | `string` | required | Form field name |
| `rows` | `number` | `4` | Initial visible rows |
| `maxLength` | `number` | — | Max character count |
| `error` | `string \| undefined` | — | Error message |
| `required` | `boolean` | `false` | Required field |

**States:** Same as Input.
**Responsive:** Full width, min-height 120px.
**Accessibility:** Same as Input.

---

### Select / Dropdown

| Property | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | required | Visible label |
| `name` | `string` | required | Form field name |
| `options` | `{ label: string; value: string }[]` | required | Dropdown options |
| `value` | `string` | — | Selected value |
| `placeholder` | `string` | `'Select...'` | Default text |
| `error` | `string \| undefined` | — | Error message |
| `disabled` | `boolean` | `false` | Disabled state |

**States:** Default → Open (options list) → Selected → Error → Disabled
**Responsive:** Full width on all sizes. Options list renders as native `<select>` on mobile for better UX, custom dropdown on desktop.
**Accessibility:** Native `<select>` or custom with `role="listbox"`, `aria-expanded`, keyboard navigation.

---

### Modal / Dialog

| Property | Type | Default | Description |
|---|---|---|---|
| `isOpen` | `boolean` | required | Controls visibility |
| `onClose` | `() => void` | required | Close handler |
| `title` | `string` | — | Modal heading |
| `children` | `ReactNode` | required | Modal body |
| `size` | `'sm' \| 'md' \| 'lg' \| 'full'` | `'md'` | Modal width |

**States:** Closed → Opening (fade in) → Open → Closing (fade out)
**Responsive:** `sm`/`md`/`lg` = centered card. `full` = full screen on mobile.
**Accessibility:** Focus trap inside modal. `Escape` closes. `aria-modal="true"`, `role="dialog"`, `aria-labelledby` linked to title. Returns focus to trigger element on close.
**Implementation:** Use a portal (`createPortal`). Overlay click closes. Body scroll locked when open.

---

### ConfirmDialog

| Property | Type | Default | Description |
|---|---|---|---|
| `isOpen` | `boolean` | required | Controls visibility |
| `onConfirm` | `() => void` | required | Destructive action handler |
| `onCancel` | `() => void` | required | Cancel handler |
| `title` | `string` | required | Confirmation heading |
| `message` | `string` | required | Explanation of consequences |
| `confirmLabel` | `string` | `'Confirm'` | Confirm button text |
| `isLoading` | `boolean` | `false` | Shows spinner on confirm button |

**Accessibility:** Same as Modal. Confirm button is `variant="danger"`.

---

### Toast / Alert

| Property | Type | Default | Description |
|---|---|---|---|
| `type` | `'success' \| 'error' \| 'warning' \| 'info'` | required | Visual style |
| `message` | `string` | required | Alert text |
| `duration` | `number` | `5000` | Auto-dismiss in ms (0 = manual) |
| `onDismiss` | `() => void` | — | Manual dismiss handler |

**States:** Appearing (slide in from bottom-right) → Visible → Dismissing (slide out)
**Responsive:** Bottom-center on mobile, bottom-right on desktop.
**Accessibility:** `role="alert"`, `aria-live="polite"`.

---

### Badge / StatusBadge

| Property | Type | Default | Description |
|---|---|---|---|
| `variant` | `'draft' \| 'published' \| 'archived' \| 'new' \| 'contacted' \| 'confirmed' \| 'cancelled' \| 'completed'` | required | Color mapping |
| `children` | `ReactNode` | required | Badge text |

**States:** Color automatically mapped from variant. No interaction.
**Accessibility:** Decorative only (no aria needed if text is descriptive).

---

### Pagination

| Property | Type | Default | Description |
|---|---|---|---|
| `currentPage` | `number` | required | Active page |
| `totalPages` | `number` | required | Total pages |
| `onPageChange` | `(page: number) => void` | required | Page change handler |

**Responsive:** Desktop = page numbers with Prev/Next. Mobile = Prev/Next buttons only.
**Accessibility:** `role="navigation"`, `aria-label="Pagination"`, current page `aria-current="page"`.

---

### Breadcrumb

| Property | Type | Default | Description |
|---|---|---|---|
| `items` | `{ label: string; href?: string }[]` | required | Breadcrumb items |

**Responsive:** Desktop = full path. Mobile = truncated to last 2 items with "..." ellipsis.
**Accessibility:** `role="navigation"`, `aria-label="Breadcrumb"`, `<ol>` list.

---

### Skeleton / Loading

| Property | Type | Default | Description |
|---|---|---|---|
| `variant` | `'text' \| 'card' \| 'image' \| 'avatar' \| 'table-row'` | `'text'` | Shape of placeholder |
| `count` | `number` | `1` | Number of skeleton items |
| `width` | `string` | `'100%'` | Custom width |

**States:** Pulsing animation (opacity 0.5 → 1 → 0.5).
**Accessibility:** `aria-hidden="true"`, loading state announced via parent `aria-busy`.

---

## Block Components (`components/blocks/`)

### Hero

| Property | Type | Default | Description |
|---|---|---|---|
| `title` | `{ ar: string; en: string }` | required | Main heading |
| `subtitle` | `{ ar: string; en: string }` | — | Subheading |
| ` backgroundImage` | `string` (URL) | — | Background image URL |
| ` backgroundVideo` | `string` (URL) | — | Background video URL (overrides image) |
| ` ctas` | `{ label: { ar: string; en: string }; href: string }[]` | — | CTA buttons (max 2) |
| ` overlay` | `boolean` | `true` | Dark overlay on background for text readability |
| ` align` | `'left' \| 'center'` | `'left'` | Text alignment |

**Responsive:** Desktop = side-by-side (image right, text left). Mobile = text over image, CTAs stacked.
**Accessibility:** `<h1>` for title. Background image/video has `alt`/`aria-label`. Sufficient contrast via overlay.
**Implementation:** Use Next/Image for background if image, `<video>` tag if video. Lazy load video (no autoplay sound).

---

### FeatureGrid

| Property | Type | Default | Description |
|---|---|---|---|
| `title` | `{ ar: string; en: string }` | — | Section heading |
| `items` | `{ icon: string; title: { ar: string; en: string }; description: { ar: string; en: string } }[]` | required | Feature items |

**Responsive:** 4 cols → 2 cols → 1 col. Hides entirely if items empty.
**Accessibility:** Grid semantics. Each item has icon (decorative `aria-hidden`) + heading + description.

---

### EntityCards

| Property | Type | Default | Description |
|---|---|---|---|
| `title` | `{ ar: string; en: string }` | — | Section heading |
| `entities` | `Hospital[]` | required | Array of hospital objects |
| `linkTo` | `string` | `'/hospitals'` | "View all" link |

**Responsive:** 3 cols → 2 cols → 1 col (carousel on mobile).
**Accessibility:** Each card is a link (`<a>`). Image has `alt` text from entity name.

---

### ServiceCards

| Property | Type | Default | Description |
|---|---|---|---|
| `title` | `{ ar: string; en: string }` | — | Section heading |
| `centers` | `MedicalCenter[]` | required | Array of center objects |
| `featuredOnly` | `boolean` | `true` | Filter to featured only |

**Responsive:** 4 cols → 2 cols → 1 col.

---

### TeamGrid

| Property | Type | Default | Description |
|---|---|---|---|
| `title` | `{ ar: string; en: string }` | — | Section heading |
| `doctors` | `Doctor[]` | required | Array of doctor objects |
| `filters` | `{ hospitalId?: string; centerId?: string; specialty?: string }` | — | Active filters |
| `paginated` | `boolean` | `false` | Show pagination |
| `pageSize` | `number` | `12` | Items per page |

**Responsive:** 4 cols → 2 cols → 1 col (carousel on mobile).
**States:** Default → Loading (Skeleton) → Empty → No-Results (after filtering).

---

### StepsTimeline

| Property | Type | Default | Description |
|---|---|---|---|
| `steps` | `{ number: number; icon?: string; title: { ar: string; en: string }; description: { ar: string; en: string } }[]` | required | Timeline steps |

**Responsive:** Desktop = horizontal. Mobile = vertical (icon left of text).
**Accessibility:** `<ol>` list with `role="list"`. Each step has heading + description.

---

### NewsGrid / NewsCard

| Property | Type | Default | Description |
|---|---|---|---|
| `posts` | `NewsPost[]` | required | Array of news posts |
| `showSourceBadge` | `boolean` | `true` | Show Manual/Social badge |

**Responsive:** 3 cols → 1 col.
**Accessibility:** Each card is a link. Image has `alt`. Date has `datetime` attribute.

---

### ContactBlock

| Property | Type | Default | Description |
|---|---|---|---|
| `phone` | `string` | from Settings | Phone number |
| `email` | `string` | from Settings | Email address |
| `address` | `{ ar: string; en: string }` | from Settings | Physical address |
| `mapCoordinates` | `{ lat: number; lng: number }` | from Settings | Map center |

**Responsive:** Desktop = 2 cols (info + map). Mobile = stacked.

---

### ContactForm

| Property | Type | Default | Description |
|---|---|---|---|
| `onSuccess` | `() => void` | — | Callback after successful submission |

**Fields:** name (required, 2-100 chars), email (required, valid format), phone (optional, 8-15 digits), message (required, 10-1000 chars).
**States:** Default → Submitting → Success → Error → Field-error (per field).
**Rate Limit:** 5 attempts/hour per IP + optional reCAPTCHA.
**Validation:** Zod schema on client, class-validator on server. See `04_API_SPECIFICATION.md` §4.

---

### RichTextBlock

| Property | Type | Default | Description |
|---|---|---|---|
| `content` | `{ ar: string; en: string }` | required | Rich text HTML/JSON |

**Responsive:** max-width 800px, centered. Full width on mobile.
**Accessibility:** Semantic HTML (headings, lists, links). Images within have `alt`.

---

### StatisticsBlock

| Property | Type | Default | Description |
|---|---|---|---|
| `stats` | `{ value: number; label: { ar: string; en: string } }[]` | required | Statistics to display |
| `animated` | `boolean` | `true` | Count-up animation on scroll |

**Responsive:** 4 cols → 2 cols → 1 col.
**Accessibility:** Numbers announced by screen readers. Animation respects `prefers-reduced-motion`.

---

### TestimonialsCarousel

| Property | Type | Default | Description |
|---|---|---|---|
| `testimonials` | `Testimonial[]` | required | Array of testimonials |
| `audience` | `'investor' \| 'doctor' \| 'patient'` | — | Filter by audience |

**States:** Auto-play (pauses on hover). Manual prev/next.
**Responsive:** Desktop = 2-3 cards visible. Mobile = 1 card.
**Accessibility:** `aria-roledescription="carousel"`, prev/next buttons labeled.

---

### FilterBar

| Property | Type | Default | Description |
|---|---|---|---|
| `filters` | `{ name: string; options: { label: string; value: string }[]; multi?: boolean }[]` | required | Filter definitions |
| `activeFilters` | `Record<string, string \| string[]>` | `{}` | Current active filters |
| `onFilterChange` | `(filters: Record<string, string \| string[]>) => void` | required | Change handler |

**Responsive:** Desktop = horizontal buttons. Mobile = dropdown or drawer.
**Accessibility:** Active filters shown as removable chips. Filter buttons have `aria-pressed`.

---

### SearchInput

| Property | Type | Default | Description |
|---|---|---|---|
| `placeholder` | `string` | `'Search...'` | Placeholder text |
| `onSearch` | `(query: string) => void` | required | Search handler |
| `debounceMs` | `number` | `300` | Debounce delay |
| `minChars` | `number` | `2` | Minimum chars before search fires |

**States:** Default → Typing → No-results → Results available.
**Accessibility:** `role="search"`, `aria-label`.

---

## Feature Components (`components/features/`)

### HospitalCard

| Property | Type | Default | Description |
|---|---|---|---|
| `hospital` | `Hospital` | required | Hospital data object |

**Displays:** Logo, name (current locale), short description, brand_color accent.
**States:** Default → Hover (subtle lift + shadow increase).
**Responsive:** Full width of parent grid cell.
**Accessibility:** Entire card is a link. Image has `alt` from hospital name.

---

### DoctorCard

| Property | Type | Default | Description |
|---|---|---|---|
| `doctor` | `Doctor` | required | Doctor data object |

**Displays:** Photo, name, specialty, hospital/center affiliations.
**States:** Default → Hover.
**Responsive:** Square photo (fixed aspect ratio) on all sizes.
**Accessibility:** Link to doctor detail. Photo has `alt`.

---

### AppointmentForm / Drawer

| Property | Type | Default | Description |
|---|---|---|---|
| `isOpen` | `boolean` | required | Controls visibility |
| `onClose` | `() => void` | required | Close handler |

**Fields:** name (required), phone (required, Egyptian format), email (optional), hospitalId (dropdown), medicalCenterId (dropdown, dependent on hospital), preferredDate (future dates only), message (optional).
**States:** Default → Submitting → Success → Error.
**Responsive:** Desktop = Drawer from right. Mobile = Full-screen modal.
**Validation:** Zod schema. Rate limit 5/hour per IP. See `02_INFORMATION_ARCHITECTURE_AND_PAGES.md` §12.

---

### ChatWidget

| Property | Type | Default | Description |
|---|---|---|---|
| `locale` | `'ar' \| 'en'` | from URL | Current language |

**States:** Closed → Open → Typing (AI responding) → Escalated (redirected to human).
**Responsive:** Desktop = floating panel (bottom-right, 400×500px). Mobile = full-screen overlay.
**Accessibility:** `role="complementary"`, chat messages in `aria-live="polite"` region, input has `aria-label`.
**Implementation:** See `01_ARCHITECTURE.md` §7, `04_API_SPECIFICATION.md` §7.

---

### StickyActionsBar

| Property | Type | Default | Description |
|---|---|---|---|
| `emergencyPhone` | `string` | from Settings | Emergency phone number |
| `whatsappNumber` | `string` | from Settings | WhatsApp number |
| `bookAppointment` | `() => void` | opens AppointmentDrawer | Book button handler |

**Responsive:** Desktop = vertical floating right side. Mobile = horizontal fixed bottom bar.
**Accessibility:** Each button has `aria-label`. Emergency button is `variant="danger"`.

---

### LanguageSwitcher

| Property | Type | Default | Description |
|---|---|---|---|
| `locale` | `'ar' \| 'en'` | from URL | Current locale |

**Behavior:** Toggles between `/ar/...` and `/en/...` while preserving the current page path.
**Responsive:** Desktop = flag icon + language text. Mobile = icon only.
**Accessibility:** `aria-label="Switch language"`, current language indicated.

---

## Admin Components (`components/admin/`)

### DataTable

| Property | Type | Default | Description |
|---|---|---|---|
| `columns` | `Column[]` | required | Column definitions |
| `data` | `any[]` | required | Row data |
| `isLoading` | `boolean` | `false` | Shows skeleton rows |
| `pagination` | `{ page, pageSize, total, onPageChange }` | — | Pagination config |
| `filters` | `FilterConfig[]` | — | Built-in filters |
| `searchable` | `boolean` | `false` | Shows search input |
| `bulkActions` | `BulkAction[]` | — | Bulk action buttons |
| `onRowClick` | `(row) => void` | — | Row click handler |

**States:** Default → Loading (skeleton) → Empty (no data message) → Error.
**Responsive:** Desktop = full table. Mobile = card layout per row.
**Accessibility:** `<table>` with proper `<th>` headers. Sort buttons have `aria-sort`. Pagination as above.

---

### SidebarNavigation

| Property | Type | Default | Description |
|---|---|---|---|
| `items` | `NavItem[]` | from DB | Navigation items |
| `currentPath` | `string` | from router | Active item detection |
| `isCollapsed` | `boolean` | `false` | Collapse state |
| `permissions` | `Record<string, string[]>` | from auth | User permissions |

**Responsive:** Desktop = persistent sidebar. Tablet = collapsible. Mobile = drawer (overlay).
**Accessibility:** `role="navigation"`, `aria-label="Admin navigation"`, active item `aria-current="page"`.

---

### FormBuilderField (Bilingual Tabs)

| Property | Type | Default | Description |
|---|---|---|---|
| `name` | `string` | required | Field name |
| `label` | `string` | required | Field label |
| `type` | `'text' \| 'richtext' \| 'number' \| 'date' \| 'select' \| 'image'` | `'text'` | Field type |
| `bilingual` | `boolean` | `true` | Shows AR/EN tabs |
| `required` | `boolean` | `false` | Required field |

**States:** Default → Error → Missing-translation (warning tab indicator).
**Accessibility:** Tabs use `role="tablist"` / `role="tab"` / `role="tabpanel"`.

---

### PageBuilderCanvas

| Property | Type | Default | Description |
|---|---|---|---|
| `sections` | `Section[]` | required | Current page sections |
| `onAdd` | `(componentType: string) => void` | required | Add section handler |
| `onUpdate` | `(id: string, config: any) => void` | required | Update section handler |
| `onReorder` | `(orderedIds: string[]) => void` | required | Reorder handler |
| `onDelete` | `(id: string) => void` | required | Delete section handler |
| `previewLocale` | `'ar' \| 'en'` | current | Preview language |

**States:** Default → Dragging → Section-selected.
**Responsive:** Desktop = drag-and-drop. Mobile = up/down buttons (drag disabled).
**Accessibility:** Grab handle `aria-label="Drag to reorder"`, delete has confirmation dialog.

---

### ImagePicker / MediaUploader

| Property | Type | Default | Description |
|---|---|---|---|
| `value` | `string` (URL) | — | Currently selected image |
| `onChange` | `(url: string) => void` | required | Selection handler |
| `folderId` | `string` | — | Filter by folder |
| `accept` | `string` | `'image/*'` | Accepted file types |
| `maxSize` | `number` | `10MB` | Max file size |

**States:** Default → Browsing (media library modal) → Uploading (progress bar) → Error.
**Responsive:** Desktop = modal picker. Mobile = full-screen picker.
**Accessibility:** Upload button `aria-label`, progress announced via `aria-live`.

---

### AuditDiffViewer

| Property | Type | Default | Description |
|---|---|---|---|
| `before` | `Record<string, any>` | required | State before change |
| `after` | `Record<string, any>` | required | State after change |

**Responsive:** Desktop = side-by-side. Mobile = stacked (before on top, after below).
**Accessibility:** Changes highlighted with color + text (not color alone). `aria-label="Changes overview"`.

---

## Additional Components (Referenced in Pages)

> The following components are used in page layouts (see `02_INFORMATION_ARCHITECTURE_AND_PAGES.md` and `14_UI_SCREEN_SPECIFICATION.md`) and need implementation.

### Gallery

| Property | Type | Default | Description |
|---|---|---|---|
| `media` | `{ url: string; type: 'image' \| 'video'; alt?: { ar: string; en: string } }[]` | required | Media items |
| `layout` | `'grid' \| 'masonry' \| 'carousel'` | `'grid'` | Display layout |

**States:** Default → Lightbox (click image to expand) → Empty (hidden).
**Responsive:** Desktop = 3-column grid. Tablet = 2-column. Mobile = horizontal scroll carousel.
**Accessibility:** Each image has `alt` text. Videos have `aria-label`. Lightbox closes with Escape.

---

### HostedByBlock

| Property | Type | Default | Description |
|---|---|---|---|
| `hospitals` | `{ name: { ar: string; en: string }; slug: string; logoUrl?: string }[]` | required | Hosting hospitals |

**Purpose:** Shown on Medical Center Detail pages. Displays which hospital(s) the center is affiliated with, with links.
**Responsive:** Horizontal chips/badges on desktop, vertical list on mobile.

---

### ServicesList

| Property | Type | Default | Description |
|---|---|---|---|
| `services` | `{ title: { ar: string; en: string }; description: { ar: string; en: string } }[]` | required | Services offered |

**Purpose:** Shown on Medical Center Detail pages. Lists the services within that center (distinct from `ServiceCards` which lists centers themselves).
**Responsive:** 2-column list on desktop, single column on mobile.

---

### DoctorProfileHeader

| Property | Type | Default | Description |
|---|---|---|---|
| `doctor` | `Doctor` | required | Full doctor object |
| `showAffiliations` | `boolean` | `true` | Show hospital/center links |

**Purpose:** Full-width header on Doctor Detail pages with photo, name, specialty, and affiliations.
**Responsive:** Desktop = horizontal (photo left, info right). Mobile = stacked.

---

### ArticleHeader

| Property | Type | Default | Description |
|---|---|---|---|
| `title` | `{ ar: string; en: string }` | required | Article title |
| `featuredImage` | `string` | — | Hero image URL |
| `publishedAt` | `string` (ISO date) | required | Publish date |
| `category` | `{ name: { ar: string; en: string } }` | — | News category |
| `sourceType` | `'manual' \| 'social_sync'` | — | If social, show badge |

**Purpose:** Top section of News Post Detail pages.
**Accessibility:** `<h1>` for title. `<time datetime="...">` for date.

---

### ArticleBody

| Property | Type | Default | Description |
|---|---|---|---|
| `content` | `{ ar: string; en: string }` | required | Rich text content |

**Purpose:** Main content area of News Post Detail. Renders rich text HTML.
**Responsive:** max-width 720px for readability.

---

### ShareButtons

| Property | Type | Default | Description |
|---|---|---|---|
| `url` | `string` | required | Current page URL |
| `title` | `string` | required | Page title for sharing |

**Purpose:** Social sharing buttons (Facebook, Twitter/X, LinkedIn, WhatsApp).
**Responsive:** Horizontal on desktop, vertical on mobile.

---

### RelatedNews

| Property | Type | Default | Description |
|---|---|---|---|
| `posts` | `NewsPost[]` | required | Related news posts |

**Purpose:** Shows 3 related articles at the bottom of News Post Detail.
**Responsive:** 3 columns → 1 column.

---

### RelatedDoctors

| Property | Type | Default | Description |
|---|---|---|---|
| `doctors` | `Doctor[]` | required | Related doctors |

**Purpose:** Shows related doctors on Doctor Detail pages (same specialty/center).
**Responsive:** Carousel on mobile.

---

### MapBlock

| Property | Type | Default | Description |
|---|---|---|---|
| `coordinates` | `{ lat: number; lng: number }` | required | Map center |
| `label` | `string` | — | Pin label |

**Purpose:** Embedded map on Contact page and entity detail pages.
**Responsive:** Full width. Fixed height (300px desktop, 200px mobile).
**Implementation:** Use a lightweight map library (Leaflet) or static map image to avoid heavy dependencies.

---

### ContactInfoBlock

| Property | Type | Default | Description |
|---|---|---|---|
| `phone` | `string` | from Settings | Contact phone |
| `email` | `string` | from Settings | Contact email |
| `address` | `{ ar: string; en: string }` | from Settings | Physical address |
| `workingHours` | `{ ar: string; en: string }` | from Settings | Working hours text |

**Purpose:** Displays contact information in a structured format.

---

### DownloadableFile

| Property | Type | Default | Description |
|---|---|---|---|
| `fileUrl` | `string` | required | File URL (S3) |
| `fileName` | `{ ar: string; en: string }` | required | Display name |
| `fileType` | `string` | — | File type badge (PDF, etc.) |

**Purpose:** Download button for files (e.g., Investor Page presentation).
**Accessibility:** `download` attribute on link. File type and size announced.

---

### CTA (Call-to-Action Block)

| Property | Type | Default | Description |
|---|---|---|---|
| `title` | `{ ar: string; en: string }` | required | CTA heading |
| `description` | `{ ar: string; en: string }` | — | Supporting text |
| `buttons` | `{ label: { ar: string; en: string }; href: string; variant?: 'primary' \| 'secondary' }[]` | required | Action buttons |

**Purpose:** Standalone CTA section used across multiple pages (About, Hospitals, Medical Centers).
**Responsive:** Centered text, buttons side-by-side on desktop, stacked on mobile.

---

### BulkActionsBar

| Property | Type | Default | Description |
|---|---|---|---|
| `selectedCount` | `number` | required | Number of selected rows |
| `actions` | `{ label: string; onClick: () => void; variant?: 'default' \| 'danger' }[]` | required | Available actions |
| `onClearSelection` | `() => void` | required | Clear selection handler |

**Purpose:** Appears at bottom of DataTable when rows are selected. Shows count + action buttons.
**Responsive:** Desktop = fixed bottom of table area. Mobile = fixed bottom of screen (full width).
**Accessibility:** `role="toolbar"`, `aria-label="Bulk actions"`.
