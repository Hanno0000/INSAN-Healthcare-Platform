-- Semantic retrieval was structurally dead, not merely empty.
--
-- `AiKnowledgeBase` was created by the init migration WITHOUT an `embedding`
-- column, while schema.prisma declared `embedding Unsupported("vector")?` and
-- SemanticSource queried `WHERE "isActive" = true AND embedding IS NOT NULL`.
-- That query cannot parse against a table with no such column, so every
-- semantic lookup threw, was swallowed by the source's try/catch, and returned
-- nothing. The prose half of the retriever has never once returned a row.
--
-- `hospitals` is added at the same time and for a harder reason. Scope
-- enforcement in this system is a QUERY FILTER, never a prompt instruction
-- (ARCHITECTURE.md §3) — Future must not be able to *see* Delta-only content.
-- The ENT centre is Delta-only; the Cardiac centre is at both. Ingesting either
-- into a table the retriever cannot filter would let a Future conversation
-- retrieve a Delta-only centre, which is precisely the failure the whole scope
-- design exists to prevent. A row with an empty array is ecosystem-wide and
-- visible to every scope, which is the correct default for platform-level prose.

-- ─── Extensions ──────────────────────────────────────────────────────────
-- Already created by 20260803000000_receptionist_layer; repeated because this
-- migration must be safe to apply to a database that skipped it.
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── Columns ─────────────────────────────────────────────────────────────
-- 768 dimensions: Gemini text-embedding-004, the model SemanticSource already
-- calls in embed(). Changing the embedding model means changing this number and
-- re-embedding every row — the dimension is part of the data, not a setting.
ALTER TABLE "AiKnowledgeBase"
  ADD COLUMN IF NOT EXISTS "embedding" vector(768);

-- Which hospitals a row may be served to. Empty = ecosystem-wide.
-- Values are Hospital.slug ('future-hospital', 'delta-hospital').
ALTER TABLE "AiKnowledgeBase"
  ADD COLUMN IF NOT EXISTS "hospitals" TEXT[] NOT NULL DEFAULT '{}';

-- Provenance, so a re-ingest can replace exactly what it wrote and nothing
-- else. Hand-authored rows entered through /admin have a NULL sourceRef and are
-- never touched by the ingestion script.
ALTER TABLE "AiKnowledgeBase"
  ADD COLUMN IF NOT EXISTS "sourceRef" TEXT;

-- One row per (source file section). Lets the ingester upsert instead of
-- accumulating duplicates every run.
CREATE UNIQUE INDEX IF NOT EXISTS "AiKnowledgeBase_sourceRef_key"
  ON "AiKnowledgeBase" ("sourceRef")
  WHERE "sourceRef" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "AiKnowledgeBase_hospitals_idx"
  ON "AiKnowledgeBase" USING GIN ("hospitals");

-- No ANN (ivfflat/hnsw) index deliberately. Those are approximate — they trade
-- recall for speed and need to be built against a populated table to pick a
-- sane list count. At the scale this table will hold (hundreds of rows, not
-- millions) exact search is already sub-millisecond, and exact is the right
-- default when a missed row means a patient is told "I don't know" about a
-- service that exists. Add one when the row count justifies it.
