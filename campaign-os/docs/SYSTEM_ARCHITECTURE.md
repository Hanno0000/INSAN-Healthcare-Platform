# INSAN Campaign OS — System Architecture

> **Version:** 1.0
> **Date:** 2026-07-29
> **Status:** **Current, with a caveat** — all ten workers now exist in code; 🟡
> marks the five that have never run. See docs/DOCUMENT_STATUS.md.
> **Audience:** Any engineer or AI worker joining this project with no prior context.
>
> ⚠️ **Caveat added 2026-08-04.** The diagrams below (§3, §4) show the Campaign
> Calendar and Campaign Cards reaching Content Pipeline through a live spreadsheet
> **VLOOKUP**. That formula was deleted from the workbook on 2026-08-02 along with
> every other transfer formula — see `START_HERE.md` §6.5. The join is now an
> explicit step, **`AI Workers → Planning → Transfer Rows Forward`**, run by
> `Transfer.gs`, which matches every field **by column header, never by
> position**. The two spots that stated a hard positional requirement (§4's "must
> stay in positions O:Z") have been corrected; the ASCII diagrams still draw an
> arrow labelled `VLOOKUP` and should be read as "the join happens here," not as a
> literal formula.

---

## 0. How to read this document

This is the **entry point** for the whole system. It answers four questions:

1. What is INSAN, as a business? → §1
2. What is a "campaign", and where does campaign knowledge live? → §2, §3
3. What are the workers, and what does each one take and produce? → §4, §5
4. Which cell in which tab holds which piece of data? → §6

If you only read one section, read **§4 (the tree)** and **§6 (the data contract)**.

**Related documents**

| Document | What it holds |
|---|---|
| `business/brand/MEDICAL_SERVICES_TAXONOMY.md` | **Departments vs Centers vs Clinics — shared with the Website Platform** |
| `business/knowledge/KNOWLEDGE_BASE_SPEC.md` | How to write a knowledge file, and the entity registry |
| `docs/architecture/WORKER_CONTRACTS_V2.md` | Exact input/output columns per worker |
| `docs/roadmap/GAP_REGISTER.md` | What is missing, in priority order |
| `docs/OPERATIONAL_AUDIT.md` · `docs/AUDIT_B_OUTPUT_AND_PORTFOLIO.md` | The two audits, machinery and product |
| `business/brand/MASTER_BRAND_ARCHITECTURE.md` | Brand hierarchy — governs everything here |

---

## 1. The business

INSAN is a **healthcare platform**, not a hospital. It manages and operates hospitals
and medical centers under one unified standard, so that a patient meets the same
system and the same quality wherever they go inside the ecosystem.

```
INSAN  (Master Brand — Egyptian Healthcare Platform)
│
├── Future Specialized Hospital        (Sub-Brand)   → managed by Wedge Medical
└── Delta International Hospital       (Sub-Brand)   → managed by L'Avenir Medical
```

Each hospital contains **Medical Services**. This is where an important distinction
lives, and getting it wrong is the single most common modelling error in this project.

### 1.1 Medical Services — three sibling kinds

> **Canonical definition:** `business/brand/MEDICAL_SERVICES_TAXONOMY.md`
> That document is the source of truth and is shared with the Website Platform.
> The summary below exists so this page reads on its own; if the two ever
> disagree, the taxonomy wins.

`Medical Services` is a *category*, not a list. It contains three kinds of entity that
sit at the **same level as siblings** — peers, not parent and child:

```
Medical Services
│
├── A. Departments  (أقسام)
│      Hospital-wide clinical operations. No clinic roster. Never a "center".
│      ICU · Emergency · Operating Rooms · Radiology · Laboratory
│
├── B. Medical Centers  (المراكز الطبية)                  (Signature Brands)
│      A branded grouping of several clinics of one specialty family,
│      PLUS the non-clinic services that specialty needs.
│      Today every center sits inside a hospital; standalone is a future step.
│
└── C. Outpatient Clinics  (العيادات الخارجية)
       The individual clinic roster (30–40).
       A clinic MAY belong to a center — and may not.
```

**A center is not merely a group of clinics.** Orthopedic & Sports Injury Center
contains the orthopedic, rheumatology and sports-injury clinics **plus** examinations,
imaging and laboratory services. The clinics are part of the center's services, not
the whole of them.

**Outpatient Clinics is its own Medical Service, not a sub-level of centers.** A
Gynaecology clinic can exist with no Gynaecology center. In data terms:

| Relationship | Nullable |
|---|---|
| Clinic → Hospital | **No** — every clinic is in a hospital |
| Clinic → Medical Center | **Yes** — a clinic may have no center |
| Medical Center → Hospital | **Yes** *(always set today; standalone centers are planned)* |

**Why this matters here.** Modelling these three in one flat list is what produced the
conflict in §9.1 — five Departments filed as Centers while six real Centers had no
card at all.

### 1.2 The twelve Medical Centers

Authoritative list, from `MASTER_BRAND_ARCHITECTURE.md` §5:

| # | Arabic | Working English name |
|---|---|---|
| 1 | مركز القلب والباطنة وإحالة الرعايات الحرجة | Cardiac & Internal Medicine Center |
| 2 | مركز جراحات المسالك والليزر | Urology & Laser Surgery Center |
| 3 | مركز مناظير الجهاز الهضمي والكبد | Digestive & Liver Endoscopy Center |
| 4 | مركز الجراحات العامة والمناظير | General Surgery & Endoscopy Center |
| 5 | مركز القدم السكري والأوعية الدموية | Diabetic Foot & Vascular Center |
| 6 | مركز علاج الألم والتدخلات المحدودة | Pain Management Center |
| 7 | مركز صحة المرأة والطفل | Women's & Children's Health Center |
| 8 | مركز الأسنان للكبار والأطفال وذوي الهمم | Dental Center |
| 9 | مركز الأنف والأذن وجراحات الرقبة والرأس | ENT & Head/Neck Surgery Center |
| 10 | مركز العظام وإصابات الملاعب | Orthopedic & Sports Injury Center |
| 11 | مركز الصدر واضطرابات النوم | Chest & Sleep Disorders Center |
| 12 | مركز صحة كبار السن والفحص الشامل | Senior Health & Screening Center |

**Rule:** this table is the only authoritative list of Medical Centers. Anything that
names a "center" not on this list is either a Department (§1.1 A) or an error.

---

## 2. Campaign taxonomy

A **campaign** is a sustained communication effort about one subject. Six types:

| Type | Subject | Examples |
|---|---|---|
| **Corporate** | The INSAN master brand | Why INSAN? · Brand Identity · Healthcare Leadership · Growth & Transformation |
| **Hospital** | A sub-brand hospital | Delta Restore Trust · Future Hospital Leadership |
| **Medical Service** | A department, center or clinic | ICU Center · Emergency Center · Orthopedic Center |
| **Signature Program** | A named long-term program | Kabarona (Continuous Care) · Senior Care |
| **Educational** | Public medical awareness | Myth vs Fact · Health Awareness · Prevention Tips |
| **Supporting** | The people and life behind the brand | Meet Our Doctors · Behind The Scenes · Hospital Life · Success Stories · Patient Journey · FAQ · Community Impact (CSR) |

**Supporting campaigns are first-class.** They are not filler. They currently occupy
~35 scheduled slots and they need knowledge files exactly like a medical service does —
what is this campaign, what is its purpose, what belongs in it, what does not. A
Supporting campaign's knowledge file describes *the campaign*, where a Medical Service
file describes *the entity*; the structure is otherwise the same.

---

## 3. Where knowledge lives — the two-layer rule

This is the most important architectural decision in the system, and it exists to
answer one question: **should campaign data live in the sheet or in files?**

**Answer: both, but they hold different things, and one is derived from the other.**

```
┌──────────────────────────────────────────────────────────────────┐
│  LAYER 1 — KNOWLEDGE FILE          business/knowledge/**/*.md    │
│                                                                  │
│  "What IS this entity?"                                          │
│                                                                  │
│  Permanent institutional truth. Comprehensive, long (the ICU     │
│  file is 2,761 lines). Written by a human with AI assistance     │
│  using Template.md. Changes rarely.                              │
│                                                                  │
│  SOURCE OF TRUTH.                                                │
└────────────────────────────┬─────────────────────────────────────┘
                             │  read once per campaign
                             │  by W1 Campaign Card Builder
                             ↓
┌──────────────────────────────────────────────────────────────────┐
│  LAYER 2 — CAMPAIGN CARD           Sheet tab: Campaign Cards     │
│                                                                  │
│  "What CAMPAIGN are we running about it, and on what strategy?"  │
│                                                                  │
│  A distillation plus campaign-specific decisions that do not     │
│  exist in the knowledge file: business goal, marketing goal,     │
│  priority, target post count, CTA strategy, primary KPI.         │
│                                                                  │
│  DERIVED. Regenerable. Never edited by hand as the primary copy. │
└────────────────────────────┬─────────────────────────────────────┘
                             │  VLOOKUP on Campaign Name
                             │  132+ times, once per scheduled post
                             ↓
                    Content Pipeline row
```

### 3.1 Why not put everything in the sheet

The knowledge file is ~16,000 tokens. Loading it once per post across 132 posts is
roughly 2.1 million tokens per plan. Loading it once per campaign — about 40 times —
is roughly 640,000. The card exists so the expensive read happens **once per campaign,
not once per post**.

### 3.2 Why not keep everything in files and leave the sheet as a pointer

Because the sheet is where the operator schedules, reviews, and overrides. A row must
be readable and correctable without opening a 2,700-line document. And the Content
Pipeline transfer formula needs values, not references.

### 3.3 The anti-duplication rule

The card is **not a copy** of the knowledge file. It is a derivation.

- If a fact about the entity changes → edit the **knowledge file**, then rebuild the card.
- If a campaign decision changes (priority, KPI, post count) → edit the **card**.
- Never fix a wrong fact in the card alone. It will be overwritten on the next rebuild,
  and the file will still be wrong.

Two columns make staleness visible and are mandatory:

| Column | Meaning |
|---|---|
| `Knowledge Source` | Repo-relative path of the file this card was built from |
| `Card Built At` | Timestamp of the last successful build |

If `Knowledge Source` is empty, the card was hand-written and is unmanaged — treat as
a defect.

---

## 4. The system tree

```
                    ┌──────────────────────────────────────────┐
                    │  business/knowledge/**/*.md              │
                    │  one file per entity or campaign         │
                    │  ✅ ICU   ✅ Kabarona   ❌ ~38 others     │
                    └───────────────────┬──────────────────────┘
                                        │
    ╔═══════════════════════════════════▼══════════════════════════════════╗
    ║  W1   CAMPAIGN CARD BUILDER                             🟡 UNVERIFIED ║
    ║       in : knowledge file (full)                                     ║
    ║       out: one row in Campaign Cards                                 ║
    ║       runs: once per campaign, on demand                             ║
    ║       refuses: missing section, empty section, unresolved gap marker ║
    ╚═══════════════════════════════════╤══════════════════════════════════╝
                                        ↓
                    ┌──────────────────────────────────────────┐
                    │  TAB: Campaign Cards                     │
                    │  one row per campaign                    │
                    │  ⚠️ 16 of ~41 campaigns exist            │
                    └───────────────────┬──────────────────────┘
                                        │
    ╔═══════════════════════════════════▼══════════════════════════════════╗
    ║  W2   CAMPAIGN PLANNER                                  🟡 UNVERIFIED ║
    ║       in : operator brief — duration, pages, posts/day, objective    ║
    ║            + Campaign Cards (all)                                    ║
    ║       out: Content Calendar rows                                     ║
    ║       runs: once per planning cycle                                  ║
    ║       refuses: any campaign without a usable card, by name           ║
    ╚═══════════════════════════════════╤══════════════════════════════════╝
                                        │
                    ┌──────────────────────────────────────────┐
                    │  PORTFOLIO CRITIC          🟡 UNVERIFIED │
                    │  reads the whole plan, once, before      │
                    │  production spends anything on it        │
                    │  ~15k tokens against 10.8M               │
                    └───────────────────┬──────────────────────┘
                                        ↓
                    ┌──────────────────────────────────────────┐
                    │  TAB: Content Calendar                   │
                    │  one row per scheduled post  (132 now)   │
                    └───────────────────┬──────────────────────┘
                                        │  formula → Content Pipeline B:F
                                        │  VLOOKUP → Content Pipeline G:R
                                        ↓
                    ┌──────────────────────────────────────────┐
                    │  TAB: Content Pipeline    (Source of     │
                    │  Truth for editorial)                    │
                    └───────────────────┬──────────────────────┘
                                        ↓
    ╔═══════════════════════════════════▼══════════════════════════════════╗
    ║  CONTENT TEAM                                              ✅ BUILT   ║
    ║                                                                      ║
    ║  W3  Content Strategy    → S:AJ   strategy + visual direction        ║
    ║  W4  Content Creation    → AK:AN  copy, hashtags, design prompt      ║
    ║  W5  Creative Director   → S:AJ refined + AO:AS  approval            ║
    ╚═══════════════════════════════════╤══════════════════════════════════╝
                                        │  Review Status = "Approved"
                                        ↓
                    ┌──────────────────────────────────────────┐
                    │  TAB: Visual Pipeline                    │
                    │  A:Q read-only (from Content Pipeline)   │
                    └───────────────────┬──────────────────────┘
                                        ↓
    ╔═══════════════════════════════════▼══════════════════════════════════╗
    ║  VISUAL TEAM                                               ✅ BUILT   ║
    ║                                                                      ║
    ║  W6  Visual Planner      → S:U    asset count, mode, brief           ║
    ║  W7  Media Designer      → image prompt(s)     [MediaDesigner.gs]    ║
    ║      · TextOverlay       → Arabic set as real type                   ║
    ║      · AssetIntegrity    → deterministic gate before QA              ║
    ║  W8  Visual QA           → Y:AB   score, decision, notes             ║
    ╚═══════════════════════════════════╤══════════════════════════════════╝
                                        ↓
    ╔═══════════════════════════════════▼══════════════════════════════════╗
    ║  W9   PUBLISHING WORKER                                 🟡 UNVERIFIED ║
    ║       in : approved assets + copy + page (two sheets)                ║
    ║       out: Visual Pipeline AC:AE                                     ║
    ║       no model call — nothing left to judge at this step             ║
    ║       DRY_RUN ships true; refuses a row it cannot prove is safe      ║
    ╚═══════════════════════════════════╤══════════════════════════════════╝
                                        ↓
    ╔═══════════════════════════════════▼══════════════════════════════════╗
    ║  W10  PAID ADS WORKER                                   🟡 UNVERIFIED ║
    ║       in : campaign card + published post                            ║
    ║       out: TAB "Ads Pipeline" — objective, audience, placements      ║
    ║       drafts a specification; budget is not in its schema            ║
    ╚══════════════════════════════════════════════════════════════════════╝
```

**Status: 10 of 10 workers built, 4 of them never run.** The chain is complete in
code for the first time. Nothing after the Content and Visual teams has made a
live call: W1, W2, W9 and W10 all exist and all are unverified.

---

## 5. Worker responsibilities in one line each

| # | Worker | Owns the decision |
|---|---|---|
| W1 | Campaign Card Builder | How institutional knowledge becomes a campaign strategy |
| W2 | Campaign Planner | Which campaign appears on which page on which day |
| W3 | Content Strategy | The angle, format and visual direction of one post |
| W4 | Content Creation | The words |
| W5 | Creative Director | Whether it is good enough to publish, and the final version |
| W6 | Visual Planner | How many assets, and whether real photos or generation |
| W7 | Media Designer | How the approved brief becomes an image prompt |
| W8 | Visual QA | Whether the artwork may be published |
| W9 | Publishing | When and where it goes live |
| W10 | Paid Ads | Who sees it, and for how much |

**One decision, one owner.** No worker may make a decision that belongs to another.
This rule is already enforced in the Content and Visual teams and must extend to W1,
W2, W9 and W10.

---

## 6. Data contract — which tab holds what

### Campaign Cards (one row per campaign)

| Group | Columns | Written by |
|---|---|---|
| Identity | Campaign ID, Umbrella Campaign, Master Brand, Sub-Brand, Medical Center, Campaign Name | W1 |
| Campaign decisions | Business Goal, Marketing Goal, Priority, Duration, Target Posts, Status, Execution Guidance, Desired Audience Perception | W1 |
| Strategy (→ Content Pipeline G:R) | Campaign Philosophy, Trust Platform, Core Message, Trust Promise, Emotional Trigger, Psychological Barrier, Content Pillars, Approved Content Angles, Non-Negotiable Rules, CTA Strategy, Primary KPI, Target Audience | W1 |
| Depth | Core Positioning, Human Insight, Invisible Product, Psychological Transformation, Trust Platform Type, Narrative Arc | W1 |
| Provenance **(new)** | Knowledge Source, Card Built At | W1 |

The twelve strategy columns may sit anywhere on the sheet: `Transfer.gs`
(`Transfer.CARD_STRATEGY`) matches every field by header text, not position — this
replaced an earlier spreadsheet VLOOKUP that did address them positionally. See the
caveat at the top of this document.

### Content Calendar (one row per scheduled post)

Day · Post Slot · Status · Calendar ID · Page · Campaign Group · Campaign Name ·
Hospital Brand — written by **W2**. Everything from Business Goal rightward is
denormalised campaign data and should be **dropped**; the Content Pipeline already
looks it up from Campaign Cards. Keeping both is how the two sources drift.

### Content Pipeline — 53 columns

| Range | Content | Source |
|---|---|---|
| A:F | Scheduling and identity | formula ← Content Calendar |
| G:R | The 12 strategy fields | `Transfer Rows Forward` ← Campaign Cards, by name |
| S:AJ | Strategy + visual direction | W3, refined by W5 |
| AK:AN | Copy, hashtags, design prompt | W4 |
| AO:AS | Creative Director review | W5 |
| AT:AX | System (Content ID, revision, worker, status) | code |

### Visual Pipeline — 32 columns

| Range | Content | Source |
|---|---|---|
| A:Q | Creative Package | formula ← Content Pipeline (read-only) |
| R | VISUAL_STAGE | orchestration layer only |
| S:U | Asset Count, Production Mode, Reference Asset Package | W6 |
| V:X | Generated Assets, Generation Status, Generation Timestamp | W7 |
| Y:AB | QA score, decision, notes, Final Asset URL | W8 |
| AC:AE | Publishing status, timestamp, live URL | W9 ❌ |
| AF | AI Worker | every worker |

### Ads Pipeline 🟡 — created on first run

Content ID · Campaign Name · Page · Live Post URL · Objective · Target Audience ·
Age Range · Gender · Location · Interests · Budget · Duration · Placements ·
Ad Status · Ad ID · Results · Drafted At.

Written by **W10** — except `Budget`, `Ad Status`, `Ad ID` and `Results`, which
are outside its output schema entirely and belong to the operator.

---

## 7. Source-of-truth rules

1. **Knowledge file** is the truth about an entity. Cards derive from it.
2. **Campaign Cards** is the truth about a campaign's strategy.
3. **Content Pipeline** is the truth about editorial content.
4. **Visual Pipeline** is the truth about production. It never writes back to Content Pipeline.
5. Transfers are **one-way and downstream only**.
6. A stage clears everything produced after it before writing — a stale approval is a
   false statement about work that has since been redone.

---

## 8. Operating model — where humans stay

Full automation is not the goal; **removing humans from work that does not need
judgement** is.

| Step | Today | Target |
|---|---|---|
| Write a knowledge file | Human + AI | Human + AI — **stays human.** This is the institutional memory; it must be right. |
| Build a campaign card | — | **W1**, human reviews |
| Plan a cycle | Human | **W2** from an operator brief, human approves |
| Content + visuals | AI | AI — human reviews at Creative Director and QA |
| Publish | Human | **W9**, human approves the batch |
| Paid ads | Human | **W10** drafts, human approves spend |

The operator's job becomes: **write knowledge, state the plan brief, approve at three
gates.** Everything between is machine work.

---

## 9. Known architectural defects

### 9.1 Two conflicting lists of medical centers — RESOLVED by §1.1

`Campaign Cards` mixes Departments (Emergency, ICU, Laboratory, Diagnostic & Imaging,
Surgical) with Medical Centers in one flat list, while six real centers (Urology,
Diabetic Foot, Pain, Dental, ENT, Senior Health) have no card at all. The taxonomy in
§1.1 resolves this: they are different levels and both are valid entities, but they
must be labelled by level.

**Action:** add a `Service Level` column to Campaign Cards with values
`DEPARTMENT` / `CENTER` / `CLINIC` / `PROGRAM` / `CORPORATE` / `SUPPORTING`.

### 9.2 67% of pipeline rows have no strategy — CRITICAL

The Content Calendar schedules 41 distinct campaigns. Campaign Cards covers 16.
The VLOOKUP fails for the remaining 25, and 89 of 132 rows (67%) reach the Content
Strategy Worker with all twelve strategy fields blank.

The workers were not failing. They were inventing, because nothing had been said.

**This is the highest-value defect in the system.** No prompt or image fix compares.

### 9.3 Depth columns unused

`Core Positioning`, `Human Insight`, `Invisible Product`, `Psychological
Transformation`, `Trust Platform Type`, `Narrative Arc` are filled on **1 of 16**
cards — while `MEDICAL_SERVICE_ICU.md` contains all six under those exact headings.
The knowledge exists and nothing carries it across. W1 closes this.

### 9.4 Redundant tabs

`Master Campaign Library`, `Campaign Defaults` and `Campaign Overview` overlap with
`Campaign Cards` and have no defined consumer in the flow. Decide one owner per
concept or delete.

---

## 10. Current status

| Layer | Status |
|---|---|
| Knowledge base | 🟠 7 of ~40 entities — 5 build a card, 2 await operator facts |
| Campaign Cards | 🟠 16 of ~41, depth 1 of 16 |
| W1 Card Builder | 🟡 built 2026-07-30, no production run yet |
| W2 Planner | 🟡 built 2026-07-30, no production run yet |
| Portfolio critic | 🟡 built 2026-07-30, no production run yet |
| Deterministic visual plan | 🟡 built, off by default until the visual pipeline is verified |
| Content Team | 🟢 built, running |
| Visual Team | 🟢 built; Media Designer + TextOverlay + AssetIntegrity unverified in production |
| W9 Publishing | 🟡 built 2026-07-30, dry run by default, no live post yet |
| W10 Paid Ads | 🟡 built 2026-07-30, no production run yet |
| Website platform | 🟢 separate project — see `website/Docs/CURRENT_STATE.md` |

---

*End of System Architecture.*
