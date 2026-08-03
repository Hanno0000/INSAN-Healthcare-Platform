-- Healthcare AI Layer — receptionist tables, enums and columns.
-- See Docs/RECEPTIONIST_ARCHITECTURE.md
--
-- Written defensively (IF NOT EXISTS / DO blocks) because the schema had
-- drifted ahead of the migrations folder before this point: AiProvider,
-- FaqItem, DoctorReview, ReviewStatus, the six Hospital page columns and the
-- ATTENDED/NO_SHOW appointment statuses all exist in schema.prisma with no
-- migration behind them. This file is safe to run whether or not a previous
-- `db push` already created parts of it.

-- ─── Extensions ──────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── Enums ───────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "ChatChannel" AS ENUM ('WEB', 'MESSENGER', 'WHATSAPP', 'INSTAGRAM', 'VOICE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ConversationScopeState" AS ENUM ('UNRESOLVED', 'ECOSYSTEM', 'RESOLVED', 'AMBIGUOUS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "EntryMode" AS ENUM ('DIRECT', 'ROUTER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "LeadStatus" AS ENUM (
    'INFORMATION_ONLY', 'INTERESTED', 'WARM_LEAD', 'READY_TO_BOOK',
    'NEEDS_HUMAN', 'EMERGENCY', 'SPAM', 'ABUSIVE'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "SafetyFlag" AS ENUM ('EMERGENCY', 'ABUSE', 'SPAM', 'GROUNDING_FAILURE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── ChatConversation: surface identity, scope, qualification ────────────
ALTER TABLE "ChatConversation"
  ALTER COLUMN "locale" SET DEFAULT 'ar',
  ADD COLUMN IF NOT EXISTS "brandId"              TEXT,
  ADD COLUMN IF NOT EXISTS "channel"              "ChatChannel" NOT NULL DEFAULT 'WEB',
  ADD COLUMN IF NOT EXISTS "externalId"           TEXT,
  ADD COLUMN IF NOT EXISTS "scopeState"           "ConversationScopeState" NOT NULL DEFAULT 'UNRESOLVED',
  ADD COLUMN IF NOT EXISTS "resolvedHospitalId"   TEXT,
  ADD COLUMN IF NOT EXISTS "leadStatus"           "LeadStatus" NOT NULL DEFAULT 'INFORMATION_ONLY',
  ADD COLUMN IF NOT EXISTS "slots"                JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "lastMessageAt"        TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "handedOffAt"          TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "appointmentRequestId" TEXT;

-- ─── ChatMessage: grounding contract + observability ─────────────────────
ALTER TABLE "ChatMessage"
  ADD COLUMN IF NOT EXISTS "citedRecordIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "safetyFlag"     "SafetyFlag",
  ADD COLUMN IF NOT EXISTS "modelUsed"      TEXT,
  ADD COLUMN IF NOT EXISTS "inputTokens"    INTEGER,
  ADD COLUMN IF NOT EXISTS "outputTokens"   INTEGER,
  ADD COLUMN IF NOT EXISTS "cachedTokens"   INTEGER,
  ADD COLUMN IF NOT EXISTS "latencyMs"      INTEGER;

-- ─── ServiceArea: geography → hospital routing ───────────────────────────
CREATE TABLE IF NOT EXISTS "ServiceArea" (
    "id"          TEXT NOT NULL,
    "hospitalId"  TEXT NOT NULL,
    "governorate" TEXT NOT NULL,
    "district"    TEXT NOT NULL DEFAULT '',
    "priority"    INTEGER NOT NULL DEFAULT 1,
    "isActive"    BOOLEAN NOT NULL DEFAULT true,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ServiceArea_pkey" PRIMARY KEY ("id")
);

-- ─── BrandPersona: prompt layer 2 ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "BrandPersona" (
    "id"            TEXT NOT NULL,
    "brandId"       TEXT NOT NULL,
    "entryMode"     "EntryMode" NOT NULL DEFAULT 'DIRECT',
    "displayName"   JSONB NOT NULL,
    "greeting"      JSONB NOT NULL,
    "persona"       TEXT NOT NULL,
    "businessRules" TEXT NOT NULL,
    "isActive"      BOOLEAN NOT NULL DEFAULT true,
    "version"       INTEGER NOT NULL DEFAULT 1,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BrandPersona_pkey" PRIMARY KEY ("id")
);

-- ─── Indexes ─────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS "ChatConversation_appointmentRequestId_key"
  ON "ChatConversation"("appointmentRequestId");
CREATE INDEX IF NOT EXISTS "ChatConversation_brandId_channel_idx"
  ON "ChatConversation"("brandId", "channel");
CREATE INDEX IF NOT EXISTS "ChatConversation_channel_externalId_idx"
  ON "ChatConversation"("channel", "externalId");
CREATE INDEX IF NOT EXISTS "ChatConversation_leadStatus_idx"
  ON "ChatConversation"("leadStatus");
CREATE INDEX IF NOT EXISTS "ChatConversation_lastMessageAt_idx"
  ON "ChatConversation"("lastMessageAt");

CREATE INDEX IF NOT EXISTS "ChatMessage_safetyFlag_idx"
  ON "ChatMessage"("safetyFlag");

CREATE INDEX IF NOT EXISTS "ServiceArea_governorate_district_idx"
  ON "ServiceArea"("governorate", "district");
CREATE INDEX IF NOT EXISTS "ServiceArea_isActive_idx"
  ON "ServiceArea"("isActive");
CREATE UNIQUE INDEX IF NOT EXISTS "ServiceArea_hospitalId_governorate_district_key"
  ON "ServiceArea"("hospitalId", "governorate", "district");

CREATE UNIQUE INDEX IF NOT EXISTS "BrandPersona_brandId_key"
  ON "BrandPersona"("brandId");
CREATE INDEX IF NOT EXISTS "BrandPersona_isActive_idx"
  ON "BrandPersona"("isActive");

-- ─── Foreign keys ────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_brandId_fkey"
    FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_resolvedHospitalId_fkey"
    FOREIGN KEY ("resolvedHospitalId") REFERENCES "Hospital"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_appointmentRequestId_fkey"
    FOREIGN KEY ("appointmentRequestId") REFERENCES "AppointmentRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ServiceArea" ADD CONSTRAINT "ServiceArea_hospitalId_fkey"
    FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "BrandPersona" ADD CONSTRAINT "BrandPersona_brandId_fkey"
    FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
