-- Migration: Add ATTENDED and NO_SHOW to AppointmentStatus enum
-- Add notes field to AppointmentRequest

-- Step 1: Add new enum values (PostgreSQL requires ALTER TYPE)
ALTER TYPE "AppointmentStatus" ADD VALUE 'ATTENDED';
ALTER TYPE "AppointmentStatus" ADD VALUE 'NO_SHOW';

-- Step 2: Add notes column to AppointmentRequest
ALTER TABLE "AppointmentRequest" ADD COLUMN IF NOT EXISTS "notes" TEXT;
