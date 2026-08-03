# Healthcare AI Layer

> **The conversational layer for the INSAN ecosystem.** One engine serving four
> surfaces: the INSAN website, and the INSAN, Future and Delta Facebook pages.
>
> **Start here:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
> **Blocked on:** [`docs/NEEDS_OPERATOR.md`](docs/NEEDS_OPERATOR.md)

---

## Why this folder exists, and why the code is not in it

This folder holds everything about the receptionist that is **not TypeScript**:
its behaviour, its voice, its safety rules and its operator data. The runtime
code lives in the website API.

| What | Where | Why there |
|---|---|---|
| Behaviour, voice, safety rules, operator data, docs | **`receptionist/`** *(this folder)* | Reviewable without opening code. A brand owner can read and approve a persona in a pull request. |
| NestJS module — services, adapters, controllers | `website/apps/api/src/modules/receptionist/` | It imports `PrismaService`, the auth guards and the common helpers, and the Prisma client is generated into the website workspace. Moving it out means a new pnpm package, tsconfig path aliases and a separate build target — real wiring for no benefit today. |
| Database models | `website/apps/api/prisma/schema.prisma` | One schema per database. |

This mirrors how `campaign-os/` already separates `prompts/` (content, versioned,
loaded at runtime) from `src/` (code). The receptionist has the same shape.

**If it later becomes a standalone platform** serving voice or a kiosk, the
module extracts to `packages/receptionist` as a folder move — provided it keeps
importing nothing from other feature modules. That constraint is the point of
the `core/` ↔ `channels/` boundary in the architecture doc.

---

## Layout

```
receptionist/
├── docs/
│   ├── ARCHITECTURE.md      the design authority — surfaces, scope, layers, decisions
│   └── NEEDS_OPERATOR.md    data the operator must supply, with what each one blocks
├── prompts/
│   ├── shared/              prompt layer 1 — same for all four surfaces
│   └── brands/              prompt layer 2 — one file per brand
├── safety/                  emergency and abuse lexicons (deterministic, not model-judged)
└── data/
    └── service-areas.json   geography → hospital routing, each row with its source
```

## How content reaches runtime

```
receptionist/prompts/*.md   ← git is the source of truth; changes are reviewed
        │
        │  pnpm db:seed
        ▼
BrandPersona / ServiceArea  ← the admin dashboard edits these live
        │
        ▼
ConversationEngine          ← runtime reads the database, never the filesystem
```

Files are the reviewed baseline; the database is the live value. The admin can
iterate without a deploy, and `pnpm db:seed` restores the reviewed text.

This deliberately avoids the trap Campaign OS hit: prompts held in Drive and
cached for six hours, where an edit that had not landed looked exactly like an
edit that had.

> **Note:** the seed reads this folder by relative path from the repo root, so
> seeding is a repository operation, not something that runs inside a container
> built from `website/` alone.

---

## Ground rules

1. **Scope is a data filter, never a prompt instruction.** Future must not be
   able to *see* Delta-only centers, not merely be told not to mention them.
2. **Nothing unsourced.** Every geography row cites the document it came from.
   A row with no source sends a real patient to the wrong city.
3. **No row is safer than a guessed row.** An unmapped area yields `AMBIGUOUS`,
   and the receptionist asks.
4. **Brand messaging rules are hard constraints**, not tone suggestions —
   `business/knowledge/hospitals/HOSPITAL_DELTA.md` § Never Promise binds the
   Delta receptionist the same way it binds a campaign.
