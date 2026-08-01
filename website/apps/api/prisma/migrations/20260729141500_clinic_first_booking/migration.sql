-- Drop the old constraint
ALTER TABLE "Clinic" DROP CONSTRAINT "Clinic_medicalCenterId_fkey";

-- Clear existing clinics to avoid NOT NULL violation on hospitalId
DELETE FROM "Clinic";

-- Alter Clinic table
ALTER TABLE "Clinic" ADD COLUMN "hospitalId" TEXT NOT NULL;
ALTER TABLE "Clinic" ALTER COLUMN "medicalCenterId" DROP NOT NULL;

-- Add new constraints and indexes
ALTER TABLE "Clinic" ADD CONSTRAINT "Clinic_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Clinic" ADD CONSTRAINT "Clinic_medicalCenterId_fkey" FOREIGN KEY ("medicalCenterId") REFERENCES "MedicalCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Clinic_hospitalId_idx" ON "Clinic"("hospitalId");

-- Alter AppointmentRequest table
ALTER TABLE "AppointmentRequest" ADD COLUMN "clinicId" TEXT;
ALTER TABLE "AppointmentRequest" ADD CONSTRAINT "AppointmentRequest_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "AppointmentRequest_clinicId_idx" ON "AppointmentRequest"("clinicId");
