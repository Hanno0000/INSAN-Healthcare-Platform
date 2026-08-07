# Worker Sources of Truth

> **Status:** **Current** — measured from `CONFIG.gs` and the workers' own prompt
> builders on 2026-08-07, not from documentation. Six workers' document lists
> changed that day as a direct result of measuring them; see §1.1.
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

Each column names one file:

| Column | File |
|---|---|
| Brand architecture | `business/brand/MASTER_BRAND_ARCHITECTURE.md` |
| Creative constitution | `business/brand/AI_CREATIVE_CONSTITUTION.md` |
| Platform knowledge | `business/brand/PLATFORM_KNOWLEDGE_BASE.md` |
| Project structure | `business/strategy/PROJECT_STRUCTURE.md` |
| Project decisions | `business/strategy/PROJECT_DECISIONS.md` |
| Entity registry | `business/brand/ENTITY_REGISTRY.md` |
| Visual language | `campaign-os/docs/architecture/INSAN_VISUAL_LANGUAGE_SPEC.md` |
| System constants | `campaign-os/docs/constants/SYSTEM_CONSTANTS.md` |

| Worker | Brand arch. | Creative const. | Platform knowl. | Project struct. | Project dec. | Entity registry | Visual lang. | System const. | Its own row / file |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|---|
| **W1** Campaign Card Builder | ✅ | ✅ | ✅ | ✅ | — | — | — | — | one knowledge file, in full |
| **W2** Campaign Planner | — | — | — | ✅ | ✅ | ✅ | — | — | all Campaign Cards + the brief |
| **Portfolio Critic** | ✅ | — | — | ✅ | — | — | — | — | a whole batch of rows |
| **W3** Content Strategy | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | one Content Pipeline row |
| **W4** Content Creation | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | one Content Pipeline row |
| **W5** Creative Director | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | one Content Pipeline row |
| **W6** Visual Planner | ✅ | ✅ | — | — | — | — | — | ✅ | one Visual Pipeline row |
| **W7** Media Generation | ✅ | — | — | — | — | — | ✅ | — | its own manual + the design prompt |
| **W8** Visual QA | ✅ | ✅ | — | — | — | — | ✅ | ✅ | one Visual Pipeline row + the artwork |
| **W9** Publishing | — | — | — | — | — | — | — | — | *no model call — see below* |
| **W10** Paid Ads | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | one Visual Pipeline row |

**W9 Publishing makes no model call at all.** Every decision it needs was made
upstream and is owned upstream. It only refuses or posts.

**W7 Media Generation** loads its own 8,000-token manual
(`MEDIA_GENERATION_SERVICE.md`), which is what makes it a designer rather than
string concatenation, plus the two documents above. Its docs live under
`designer.docs` rather than `docs`, one level deeper than every other worker's.

---

## 1.1 What changed on 2026-08-07, and why

The first version of this table was measured, and measuring it exposed six
workers deciding something they had no written basis for. The rule that decided
each case: **a worker reads the document it is judged against.** Not the
documents that seem related to its job — the ones that define whether its output
is right.

| Worker | Gained | The decision it was making blind |
|---|---|---|
| **W1** | project structure, platform knowledge, `hospitals` front matter | It writes `Master Brand`, `Sub-Brand`, `Medical Center` and `Service Level` — four columns about where an entity sits in the ecosystem — from a knowledge file that describes the entity and never the ecosystem. And every knowledge file states `hospitals: [Future, Delta]` in its front matter, which reached nothing: `_buildPrompt` passed `entity_name_en` and `service_level` only. So the hospital was inferred from prose. |
| **W2** | entity registry | It decides which page every post lands on. Nine centres run at Delta alone and the registry's Hospitals column is the only place that says so. Its other signal was `Sub-Brand` — W1's inference, above. Two guesses in series. |
| **Portfolio Critic** | brand architecture, project structure | It loaded **nothing at all** — no prompt file, no documents, its entire prompt a literal in `Planning.gs`. Its own instructions say *"INSAN, Future and Delta build one brand together"* and nothing anywhere told it what that sentence means. |
| **W3** | visual language | It writes nine visual columns. Five are free text — `Visual Concept`, `Visual Elements`, `Do NOT Show`, `Design Notes`, `Text On Design` — and they are the visual brief W5 and the Media Designer inherit. It was choosing this brand's visual direction without the document describing it. |
| **W7** | brand architecture | `Hospital Brand` reaches it as the bare string `"Future"`, and it composes an image around a corner reserved for that hospital's marks. Nothing told it what Future is, that it operates under INSAN, or what the two look like together. |
| **W8** | visual language | ⭐ The worst of the set. This is the **gate** — Approved / Revision Required / Rejected. The spec holds `Style Ratio`, `Strictly Prohibited Styles` and `Quality Criteria`: the criteria it is judging against. W5 had read it and W7 had read it; the only worker that passes or fails the result had not. A gate that has not read the standard approves what it should stop. |
| **W10** | project structure, platform knowledge, system constants | It proposes the objective, audience, age range, interests and placements — the whole targeting of a paid campaign. That is strategic work of the same kind W3 and W4 do, and it was reading a shorter list than either. |

### What was deliberately left alone

| Worker | Not given | Why |
|---|---|---|
| **W4** Content Creation | visual language | It writes `Design Prompt (AI)`, but W5 owns the design prompt that actually flows on and W5 reads the spec. W4 already carries the largest input in the system (~18,900 tokens a row); a 229-line document for a field that gets superseded is not worth it. |
| **W6** Visual Planner | visual language | It writes `Asset Count`, `Production Mode` and `Reference Asset Package` — how many assets and sourced from where. Logistics, not aesthetics. `worker-sources.js` asserts it does **not** load the spec, so a future tidy-up that adds it "for consistency" has to argue with a failing check. |
| **W1** | entity registry, taxonomy | `Check Entity Registry` compares the cards against the registry deterministically, which is stronger than a model reading it. `Service Level` already arrives from front matter plus the controlled vocabulary. |
| Everyone | contact directory | Contact numbers are composited by `PostFooter` from `CONFIG.POST_FOOTER.CONTACT_LINES`. No model chooses a number and none should. |

### Who places the logo — nobody, and that is correct

Worth stating because it is the natural question. **No worker places brand
marks.** `Branding.apply()` composites them in code (`AI.gs`), reading the row's
`Hospital Brand` against `CONFIG.BRANDING.BRAND_SETS` — INSAN + WEDGE + FUTURE
for a Future post, INSAN + LVENIR + DELTA for a Delta one. Position, scale and
corner are constants. An unrecognised brand gets **no marks at all** rather than
a guess, because a wrong logo on a real hospital's post is worse than no logo.

The design prompt reserves the corner; the code fills it. So the question "does
the worker doing the logo read the brand files?" has no worker in it — which is
the strongest possible answer, since a deterministic rule cannot drift.

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

### Where the planner still sits outside it

**W2 loads neither the brand architecture nor the creative constitution.** It
reads `PROJECT_STRUCTURE.md`, `PROJECT_DECISIONS.md` and — since 2026-08-07 —
`ENTITY_REGISTRY.md`.

That remains defensible: the planner schedules, it does not write copy, and the
registry answers the question that was actually hurting it (which hospital runs
what). It still does not know the brand hierarchy, and picks campaigns from the
cards' own metadata. If a future change needs it to reason about brand
relationships rather than routing, that is where to start.

The Portfolio Critic **did** sit outside it, loading nothing at all, and no
longer does — see §1.1.

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
| The registry lists **16** Medical Centers; `MASTER_BRAND_ARCHITECTURE.md` and `MEDICAL_SERVICES_TAXONOMY.md` both still say **twelve** | `entity-registry.js` |
| The live Content Calendar still schedules **ICU Center**; the knowledge file and the registry now both say **Critical Care Center** | `Check Knowledge File` |
| `KNOWLEDGE_BASE_SPEC.md` §3 lists `MEDICAL_SERVICE_` as the departments prefix, and gives `MEDICAL_DEPARTMENT_ICU.md` as its example | `knowledge-gate.js` |
| `01500668657` is listed for both INSAN and Delta — confirmed correct by the operator, kept here because it looks like an error | `CONTACT_DIRECTORY.md` §4 |

⚠️ **The centre count has now moved twice since it was pinned** — twelve, then
fourteen on 2026-08-06, then sixteen on 2026-08-07. Each move was made in one
system without the others. That drift is the argument for the pin, not evidence
against it.

**Resolved since the first version of this file:**

- Shared brand logos sat under `business/Media/Future/Brand Identity/`, inside
  one hospital's folder. They moved to `business/Media/Brand Identity/` on
  2026-08-07 — `BRAND_SETS` is the proof they cannot be per-hospital, since
  every post carries marks from several brands at once.
- ICU's knowledge file and the registry disagreed on the campaign name. The
  registry now says `Critical Care Center`. Only the live sheet is outstanding.
