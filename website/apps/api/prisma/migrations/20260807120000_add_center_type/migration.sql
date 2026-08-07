-- CreateEnum
CREATE TYPE "CenterType" AS ENUM ('CENTER', 'DEPARTMENT', 'PROGRAM');

-- AlterTable
ALTER TABLE "MedicalCenter" ADD COLUMN "registryId" TEXT;
ALTER TABLE "MedicalCenter" ADD COLUMN "type" "CenterType" NOT NULL DEFAULT 'CENTER';

-- CreateIndex
CREATE UNIQUE INDEX "MedicalCenter_registryId_key" ON "MedicalCenter"("registryId");
