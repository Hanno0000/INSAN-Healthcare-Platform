-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "DoctorReview" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "phone" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "comment" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DoctorReview_appointmentId_key" ON "DoctorReview"("appointmentId");

-- CreateIndex
CREATE INDEX "DoctorReview_doctorId_idx" ON "DoctorReview"("doctorId");

-- CreateIndex
CREATE INDEX "DoctorReview_phone_idx" ON "DoctorReview"("phone");

-- CreateIndex
CREATE INDEX "DoctorReview_status_idx" ON "DoctorReview"("status");

-- AddForeignKey
ALTER TABLE "DoctorReview" ADD CONSTRAINT "DoctorReview_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorReview" ADD CONSTRAINT "DoctorReview_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "AppointmentRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
