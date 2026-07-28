-- Migration: إضافة حقول صفحة المستشفى الجديدة (6 حقول Json)
-- كتابة يدوية مقصودة: قاعدة الإنتاج مُنحرِفة، و prisma migrate dev سيطلب reset.
-- كل الأوامر idempotent (IF NOT EXISTS) فيمكن تشغيلها أكثر من مرة بأمان.

ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "heroTagline"  JSONB;
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "heroStats"    JSONB;
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "departments"  JSONB;
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "locations"    JSONB;
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "contactInfo"  JSONB;
ALTER TABLE "Hospital" ADD COLUMN IF NOT EXISTS "journeySteps" JSONB;
