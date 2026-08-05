# TD-008 — Missing FK indexes: exact lines to add

I could not safely reconstruct a full `schema.prisma` rewrite for this one — the
project knowledge search only returned partial model bodies for some of these
models, and blindly regenerating the whole file risked silently dropping
fields I never saw. Below are the exact `@@index` lines to add inside each
named model block (add them alongside the existing `@@index`/`@@unique`
lines at the bottom of each model). These are additive — no existing lines
need to change.

```prisma
model NewsPost {
  // ...existing fields unchanged...

  @@index([categoryId])
  @@index([sourceBrandId])
}

model AppointmentRequest {
  // ...existing fields unchanged...

  @@index([hospitalId])
  @@index([medicalCenterId])
  @@index([doctorId])
}

model NavigationItem {
  // ...existing fields unchanged...

  @@index([parentId])
}

model MediaFolder {
  // ...existing fields unchanged...

  @@index([parentId])
}

model AuditLog {
  // ...existing fields unchanged...

  @@index([action])
  @@index([entityType])
}
```

## Why this is documented rather than applied as a migration

Adding these lines to `schema.prisma` is a pure text change I could make
directly. Generating and applying the actual Prisma migration
(`prisma migrate dev --name add_fk_indexes`) requires a live connection to a
real database — I don't have one from this environment. Someone with repo +
DB access (or Claude Code running against the actual project) should:

1. Add the `@@index(...)` lines above to the corresponding models.
2. Run `pnpm --filter @insan/api exec prisma migrate dev --name add_fk_indexes`
   against a real (dev/staging) database.
3. Commit the generated migration folder under `prisma/migrations/`.
4. Apply it to production via `prisma migrate deploy` as part of the normal
   deploy step (already wired into `post-merge.sh`).

This is flagged in the roadmap update as a remaining item requiring DB access,
not as "not fixed."
