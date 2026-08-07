# Worker Sources of Truth

> **Status:** **Current** — measured from `CONFIG.gs` and the workers' own prompt
> builders on 2026-08-07, not from documentation.
> **Purpose:** what each worker reads before it decides anything, and where a fact
> has to be written for a given worker to see it.
> **Held by:** `campaign-os/tests/cases/worker-sources.js`

---

## Why this exists

The operator asked a question nobody could answer from the repository: *do the
workers actually understand they are working inside the INSAN platform?*

Answering it needed a list of what each worker loads. That list existed only as
`docs:` arrays scattered through `CONFIG.gs` plus three prompt builders that load
documents directly and are not in any array. So the answer was knowable and
nowhere written.

**A fact reaches a worker only if it is in a document that worker loads.** Writing
something important into a file four of the workers never open is the same as not
writing it.

---

## 1. The table

Every worker loads its own prompt (`campaign-os/prompts/…`) plus the documents
below. Documents come from Drive at run time and are cached for six hours.

| Worker | Brand architecture | Creative constitution | Platform knowledge | Project structure | Project decisions | Visual language | System constants | Its own row / file |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|---|
| **W1** Campaign Card Builder | ✅ | ✅ | — | — | — | — | — | one knowledge file, in full |
| **W2** Campaign Planner | — | — | — | ✅ | ✅ | — | — | all Campaign Cards + the brief |
| **Portfolio Critic** | — | — | — | ✅ | ✅ | — | — | a whole batch of rows |
| **W3** Content Strategy | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | one Content Pipeline row |
| **W4** Content Creation | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | one Content Pipeline row |
| **W5** Creative Director | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | one Content Pipeline row |
| **W6** Visual Planner | ✅ | ✅ | — | — | — | — | ✅ | one Visual Pipeline row |
| **W7** Media Generation | — | — | — | — | — | — | — | the design prompt only |
| **W8** Visual QA | ✅ | ✅ | — | — | — | — | ✅ | one Visual Pipeline row + the artwork |
| **W9** Publishing | — | — | — | — | — | — | — | *no model call — see below* |
| **W10** Paid Ads | ✅ | ✅ | — | — | ✅ | — | — | one Visual Pipeline row |

**W9 Publishing makes no model call at all.** Every decision it needs was made
upstream and is owned upstream. It only refuses or posts.

**W7 Media Generation loads no documents.** It receives a finished design prompt
and renders it. Everything it should know has already been decided by W5 and W6.

---

## 2. What this means in practice

### The two documents every content worker reads

**`MASTER_BRAND_ARCHITECTURE.md`** and **`AI_CREATIVE_CONSTITUTION.md`** are the
only two documents loaded by every worker that writes, designs or judges content —
W1, W3, W4, W5, W6, W8, W10.

**So anything that must bind all of them belongs in one of those two.** That is
why the platform slogan and the attribution rule were added to
`MASTER_BRAND_ARCHITECTURE.md` §0 and §4.1 on 2026-08-05: the slogan previously
appeared only in `PLATFORM_KNOWLEDGE_BASE.md`, which W1, W6, W8 and W10 do not
load, and W1 is the worker whose output every other worker inherits.

### Where the platform relationship is stated

| Document | What it says |
|---|---|
| `MASTER_BRAND_ARCHITECTURE.md` §4 | the hierarchy — INSAN is the master brand, hospitals are sub-brands, centers are signature brands |
| `MASTER_BRAND_ARCHITECTURE.md` §4.1 | **the rule** — what each publishing page's content must carry |
| `AI_CREATIVE_CONSTITUTION.md` §16 | *Ecosystem Cross-Platform Reinforcement* — hospital content reinforces that the hospital operates under the platform |
| `MASTER_BRAND_ARCHITECTURE.md` §0 | the slogan, and that it is a philosophy rather than a signature |

All four are in documents every content worker loads. **The answer to "do the
workers understand this?" is yes — for content workers.**

### Where the planner sits outside it

**W2 and the Portfolio Critic load neither the brand architecture nor the
creative constitution.** They read `PROJECT_STRUCTURE.md` and
`PROJECT_DECISIONS.md` only.

That is defensible — the planner schedules, it does not write copy — but it means
the planner does not know the brand hierarchy. It picks campaigns and pages from
the cards' own metadata. If a future change needs the planner to reason about
brand relationships, its `docs` list is where that starts.

---

## 3. The chain, and where a fact enters it

```
   knowledge file  (one per entity — the permanent truth)
        │
        │  read ONCE, in full, by W1
        ▼
   Campaign Card   (one row per campaign — derived, regenerable)
        │
        │  carried by Transfer Rows Forward, BY COLUMN NAME
        ▼
   Content Pipeline row   + Cycle Objective (what THIS cycle wants)
        │
        ▼
   W3 → W4 → W5   (strategy, copy, approval)
        │
        ▼
   Visual Pipeline row
        │
        ▼
   W6 → W7 → W8   (plan, render, judge)
        │
        ▼
   W9 publish   →   W10 draft ads
```

**Where to write a fact so a worker sees it:**

| The fact is… | Write it in |
|---|---|
| permanently true of one entity | that entity's knowledge file |
| a rule binding all content | `MASTER_BRAND_ARCHITECTURE.md` or `AI_CREATIVE_CONSTITUTION.md` |
| what this cycle wants, differing from the campaign's standing strategy | the `Cycle Objective` — asked when planning, carried per row |
| a campaign decision that survives a card rebuild | `Priority`, `Target Posts`, `Status` on the card. Nothing else does |
| a contact number | `business/brand/CONTACT_DIRECTORY.md` |
| a controlled vocabulary value | `CONFIG.gs` — then Sync Dropdowns |

⚠️ **Editing a card to change a fact does not work.** The card is regenerated
from the knowledge file, and only the three operator-owned columns survive. Fix
the knowledge file and rebuild.

---

## 4. The consumers beyond campaigns

A knowledge file now feeds three systems, and only the campaign half was ever
specified:

| Consumer | Reads | Status |
|---|---|---|
| **Campaign workers** | the knowledge file via W1, then the card | working |
| **The receptionist** | `receptionist/data/*.json`, built from the knowledge files and the operator's documents | partly built; its own `NEEDS_OPERATOR.md` lists what blocks it |
| **The website** | `business/brand/ENTITY_REGISTRY.md` and the knowledge files | seeding in progress |

⚠️ **These three do not read the same files, and have already disagreed.** The
contact numbers held different values in `CONFIG.gs` and
`receptionist/data/hospitals.json` — see `CONTACT_DIRECTORY.md` §"Why this file
exists". Any fact needed by more than one consumer needs one home and a check
that the copies match.

---

## 5. Open disagreements between documents

Recorded rather than resolved — each is a brand-owner decision, and each is
pinned by a check so it cannot be forgotten.

| Disagreement | Held by |
|---|---|
| The registry lists **14** Medical Centers; `MASTER_BRAND_ARCHITECTURE.md` and `MEDICAL_SERVICES_TAXONOMY.md` both say **twelve** | `entity-registry.js` |
| ICU's knowledge file names its campaign **Critical Care Center**; the registry and the live Content Calendar say **ICU Center** | `entity-registry.js` |
| `KNOWLEDGE_BASE_SPEC.md` §3 lists `MEDICAL_SERVICE_` as the departments prefix, and gives `MEDICAL_DEPARTMENT_ICU.md` as its example | `knowledge-gate.js` |
| Shared brand logos live under `business/Media/Future/Brand Identity/`, inside one hospital's folder | `branding.js` |
| `01500668657` is listed for both INSAN and Delta | `CONTACT_DIRECTORY.md` §4 |
