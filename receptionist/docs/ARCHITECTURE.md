# Healthcare AI Layer — Architecture

> **Version:** 1.0
> **Date:** 2026-08-03
> **Status:** Current — the design authority for the receptionist work.
> **Scope:** Website Platform. Consumes the shared taxonomy in
> `business/brand/MEDICAL_SERVICES_TAXONOMY.md` and the brand hierarchy in
> `business/brand/MASTER_BRAND_ARCHITECTURE.md`.

---

## 1. What is being built

One conversational layer serving **four surfaces at once**, living inside the
existing NestJS API and sharing its database, admin dashboard, RBAC and audit
trail.

| # | Surface | Brand | Channel | Entry mode | Knowledge scope |
|---|---|---|---|---|---|
| 1 | INSAN website widget | `INSAN` | `WEB` | **ROUTER** | resolved at runtime |
| 2 | INSAN Facebook page | `INSAN` | `MESSENGER` | **ROUTER** | resolved at runtime |
| 3 | Future Hospital Facebook page | `FUTURE` | `MESSENGER` | **DIRECT** | Future (fixed) |
| 4 | Delta Hospital Facebook page | `DELTA` | `MESSENGER` | **DIRECT** | Delta (fixed) |

### 1.1 The reframe that makes four surfaces tractable

Four surfaces do **not** mean four knowledge bases, four prompts, or four
engines. They are:

```
2 knowledge scopes  (Future, Delta)
      ×
2 entry modes       (ROUTER for INSAN, DIRECT for a hospital page)
      ×
2 channels          (MESSENGER, WEB)
```

INSAN is a **platform, not a third hospital.** It owns no clinics, no
schedules and no doctors of its own — `MASTER_BRAND_ARCHITECTURE.md` §4 puts
hospitals one level below it. So the INSAN receptionist has no knowledge base
to author: it *borrows* a hospital's scope once it knows which one applies.

The practical consequence: **build one engine with a scope-resolution step
that is a no-op on surfaces 3 and 4.** Nothing else differs structurally
between the four.

---

## 2. Scope state machine

Scope is a property of the **conversation**, not of the surface.

```
DIRECT entry (Future / Delta pages)
    └─► RESOLVED(hospitalId)          — set at conversation creation

ROUTER entry (INSAN website + INSAN page)
    UNRESOLVED
        ├─► ECOSYSTEM                 — questions about INSAN itself.
        │                               No hospital needed, never resolves.
        └─► (service intent detected)
              └─► geography question
                    ├─► RESOLVED(hospitalId)     — catchment matched
                    └─► AMBIGUOUS                — no match / overlap →
                                                   offer the options explicitly
```

### 2.1 Resolution is lazy, and that is deliberate

A conversation on INSAN does **not** open by asking where the patient lives.
Resolution is triggered by *service intent* ("عايز أحجز", "فيه دكتور عظام؟"),
not by conversation start. A patient asking "إيه هي منظومة إنسان؟" gets an
answer, not an interrogation.

Opening with "أنت ساكن فين؟" is the single most reliable way to make this read
like a form rather than a receptionist.

### 2.2 Whose voice speaks after resolution

INSAN resolves to Delta and then **keeps speaking as INSAN**. It says
*"مستشفى الدلتا — وهي جزء من منظومة إنسان — هي الأقرب ليك"*, not *"أهلاً بيك
في الدلتا"*.

This is not a style preference. `PROJECT_DECISIONS.md` §1 makes INSAN the
master brand and hospitals sub-brands; a routing layer that impersonates the
destination erases the hierarchy the whole brand architecture exists to build.

Surfaces 3 and 4 are the opposite: they speak *as* the hospital, and reference
INSAN as the umbrella they operate under.

---

## 3. Scope is a data filter, never a prompt instruction

**The single most important rule in this document.**

`MASTER_BRAND_ARCHITECTURE.md` §5 states:

- **Future Specialized Hospital** operates **4** core medical centers
- **Delta International Hospital** operates **all 12** medical centers

So the Future receptionist must never offer the other eight. Enforcing that in
the prompt ("do not mention centers Future does not operate") gets ~95%
compliance — and the other 5% is a real patient travelling to a real building
for a service that is not there.

**Enforcement:** every retrieval query is filtered by the conversation's
resolved `hospitalId` before results reach the model. The model is never shown
a center, clinic, doctor or schedule outside its scope, so it cannot offer one.

The same rule applies to the ROUTER surfaces: while scope is `UNRESOLVED`, the
retriever returns **ecosystem-level facts only** (what INSAN is, which
hospitals exist, general policies) — never a specific clinic schedule.

---

## 4. Layers

```
┌─ Channel adapters ─────────────── thin: translation only, zero business logic
│   MessengerAdapter   HMAC verify · dedup · 24h window · psid
│   WebAdapter         anonymous session · URL context · early phone capture
└────────────────────────────────────────────────────────────────────────────
                    ▼  InboundMessage { brandId, channel, externalId, text }
╔═══ Healthcare AI Layer — channel-agnostic ════════════════════════════════╗
║                                                                           ║
║  SafetyGate       deterministic emergency / abuse / spam — runs first      ║
║  ScopeResolver    pageId → brandId · geography → hospitalId               ║
║  Retriever        DeterministicSource (SQL) + SemanticSource (pgvector)   ║
║  ContextBuilder   3 prompt layers, breakpoints on change-frequency        ║
║  ConversationEngine  slot filling · grounding contract                    ║
║  Memory           cross-conversation, retention-bounded                   ║
║  Qualifier        8 lead states                                           ║
║  Handoff          → AppointmentRequest + per-hospital notification        ║
╚═══════════════════════════════════════════════════════════════════════════╝
                    ▼
        Postgres  ·  /admin  (both already exist)
```

**The test that proves the separation is real:** if any file under `core/`
contains the strings `messenger`, `psid`, or `page_id`, the separation is
decorative. Channel identity stops at the adapter boundary.

---

## 5. Prompt layering and cache placement

Prompt caching is a **prefix match** — any byte that changes invalidates
everything after it. So layers are ordered by *rate of change*, not by size or
by logical tidiness. Four `cache_control` breakpoints are available per
request; three are used.

| Layer | Contents | Changes | Breakpoint |
|---|---|---|---|
| 1 | Creative constitution · conversation rules · safety floor | Rarely | ✅ shared by all 4 surfaces |
| 2 | Brand persona · that brand's business rules | Monthly | ✅ 3 variants |
| 3 | Scoped knowledge (hospital's centers, clinics, doctors, schedules) | When an admin edits a schedule | ✅ 2 variants |
| 4 | Retrieved answer for *this* question · conversation history | Every turn | ❌ never |

Layer 1 is written to cache once and read by all four surfaces. Putting
per-question retrieval **before** the last breakpoint is the expensive
mistake: it makes the whole prefix volatile and costs roughly **5× per turn**
versus a stable prefix. Per-question results belong in layer 4, where they are
small and cheap.

---

## 6. Decisions (settled — do not relitigate)

| Decision | Choice | Reason |
|---|---|---|
| Where it lives | Module inside `apps/api`, not a separate service | Shares DB, admin, RBAC, audit |
| Internal boundary | `core/` channel-agnostic + `channels/` adapters | Adding WhatsApp must not touch `core/` |
| Model — conversation | Claude Sonnet 5, **one model per conversation** | Switching models mid-conversation invalidates the entire cache |
| Model — side tasks | Claude Haiku 4.5 | Classification/summary use separate small prompts → no cache penalty |
| Cache TTL | `1h` | Patients reply in minutes-to-hours; the 5m default expires between turns |
| Facts (schedules, branches, doctors) | Deterministic SQL | Exactly one correct answer. Vector search returns "nearest", which is confidently wrong |
| Prose (policies, FAQ, brochures) | Semantic / pgvector | Relevance with a threshold; below it → escalate |
| Scope enforcement | Query filter on `hospitalId` | Prompt instructions leak |
| Emergency detection | Deterministic keyword rules, model confirms only | Must not be probabilistic |
| Handoff trigger | Deterministic condition | Missed handoff = lost revenue; false handoff = wasted staff time |
| Lead destination | Existing `AppointmentRequest` | Already has `hospitalId`, statuses, and a working admin screen |

---

## 7. What already exists (verified 2026-08-03)

Corrects the earlier claim that the AI chat had "schema only, no API" —
`CURRENT_STATE.md` is out of date on this point.

| Component | State | Reusable? |
|---|---|---|
| `modules/ai` — provider CRUD, masked keys, priority failover | ✅ working | **Yes** — extend, don't replace |
| `modules/ai` — Gemini embeddings + pgvector search | 🟡 written, see §7.1 | Yes, after fixes |
| `POST /ai/chat` public endpoint | 🟡 working but global | Becomes the WEB adapter's backend |
| `modules/leads` + `/admin/appointments` | ✅ working | **Yes** — the handoff target |
| `Hospital` / `MedicalCenter` / `Clinic` / `Doctor` + CRUD + admin | ✅ working | **Yes** — the knowledge backbone |
| `Brand` / `BrandSocialAccount` (`pageId`!) | 🟡 schema + seed, no code reads it | Yes — the routing key |
| `ChatConversation` / `ChatMessage` | 🔴 schema only, unused | Extend (§ Phase 1) |
| `AiProvider` / `FaqItem` / `DoctorReview` | 🔴 **schema with no migration** | Must be migrated before deploy |
| ChatWidget on the public site | 🔴 does not exist | Build |
| Messenger webhook / adapter | 🔴 does not exist | Build |
| SafetyGate / scope / memory / qualifier / handoff | 🔴 do not exist | Build |

Honest split: **the platform substrate is ~70% there; the receptionist itself
is ~15%.**

### 7.1 Defects found in the existing AI module

1. **The vector search never runs.** `ai.service.ts:160` uses
   `WHERE isActive = true` in raw SQL. Postgres folds unquoted identifiers to
   lowercase, and Prisma created the column as `"isActive"` — so the query
   errors on `isactive`, the RAG path always falls back to empty context, and
   the assistant answers ungrounded. Needs `"isActive"`.
2. **No Anthropic adapter.** `callProvider` handles OpenAI-compatible and
   Gemini only.
3. **No prompt caching** on any provider path.
4. **No persistence.** `processChat` takes the history from the client and
   writes nothing; `ChatConversation` / `ChatMessage` stay empty.
5. **No brand or scope awareness** — one global system prompt.
6. **Structured facts are not in the retrieval path at all** — the knowledge
   base is Q&A pairs; clinic schedules are never consulted.

---

## 8. Geography routing

`Hospital.locations` is freeform JSON and cannot be queried for routing. A
dedicated table is introduced:

```
ServiceArea { id, hospitalId, governorate, district?, priority, isActive }
```

- Match `district` first, fall back to `governorate`.
- `priority` breaks overlaps (both hospitals serving one governorate).
- **No match → `AMBIGUOUS`**, and the receptionist names the available options
  instead of guessing. Guessing sends a patient to the wrong city.

The catchment rows themselves are operator data — see
`RECEPTIONIST_NEEDS_OPERATOR.md`. Only one mapping is currently known
(مصر الجديدة → Future), stated by the operator on 2026-08-03.

---

## 9. Grounding contract

Every factual claim the receptionist makes must trace to a retrieved record.

1. The Retriever returns records carrying stable IDs.
2. The model is required to cite the ID it used for each factual statement.
3. A post-check verifies each cited ID appears in the set actually retrieved
   for this turn.
4. On failure the reply is replaced with:
   *"مش متأكد من المعلومة دي، هراجعها مع الفريق وأرد عليك."* and the turn is
   flagged `NEEDS_HUMAN`.

This is the line between a receptionist and something that invents clinic
hours with confidence.

---

## 10. Build order

| Phase | Deliverable | Blocked by |
|---|---|---|
| 0 | This document + `RECEPTIONIST_NEEDS_OPERATOR.md` | — |
| 1 | Prisma schema + migration (incl. fixing existing drift) | 0 |
| 2 | Module skeleton, `core/` ↔ `channels/` boundary | 1 |
| 3 | SafetyGate · ScopeResolver | 2 |
| 4 | Retriever · ContextBuilder | 3 |
| 5 | Claude provider + caching | 4 |
| 6 | ConversationEngine + grounding | 5 |
| 7 | Qualifier · Handoff | 6 |
| 8 | MessengerAdapter (3 pages) | 7 |
| 9 | WebAdapter + ChatWidget | 7 |
| 10 | Admin conversations screen | 7 |

Phases 8 and 9 are deliberately parallel: **two channels are what force the
abstraction to be real.** Building only one and "adding the second later"
reliably produces a core with the first channel's assumptions baked in.

Two tracks run alongside all of it and are not code:

- **Meta Business Verification** — 1–3 weeks, outside our control, start day 1.
- **Knowledge base data entry** — zero doctors and zero clinic schedules exist
  today. This is the largest single work item in the project and it gates
  every surface.

---

*End of document.*
