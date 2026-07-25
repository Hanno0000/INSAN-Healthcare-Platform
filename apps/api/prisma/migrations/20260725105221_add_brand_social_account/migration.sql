/*
  Warnings:

  - You are about to drop the column `sourceEntity` on the `NewsPost` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "NewsPost" DROP COLUMN "sourceEntity",
ADD COLUMN     "sourceBrandId" TEXT;

-- DropEnum
DROP TYPE "SourceEntity";

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "displayName" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandSocialAccount" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "pageId" TEXT NOT NULL,
    "pageName" TEXT NOT NULL,
    "username" TEXT,
    "integrationSettingId" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandSocialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Brand_code_key" ON "Brand"("code");

-- CreateIndex
CREATE INDEX "Brand_isActive_idx" ON "Brand"("isActive");

-- CreateIndex
CREATE INDEX "BrandSocialAccount_brandId_idx" ON "BrandSocialAccount"("brandId");

-- CreateIndex
CREATE INDEX "BrandSocialAccount_isActive_idx" ON "BrandSocialAccount"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "BrandSocialAccount_brandId_platform_key" ON "BrandSocialAccount"("brandId", "platform");

-- AddForeignKey
ALTER TABLE "BrandSocialAccount" ADD CONSTRAINT "BrandSocialAccount_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandSocialAccount" ADD CONSTRAINT "BrandSocialAccount_integrationSettingId_fkey" FOREIGN KEY ("integrationSettingId") REFERENCES "IntegrationSetting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsPost" ADD CONSTRAINT "NewsPost_sourceBrandId_fkey" FOREIGN KEY ("sourceBrandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;
