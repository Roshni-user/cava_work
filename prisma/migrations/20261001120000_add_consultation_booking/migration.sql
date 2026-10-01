-- CreateEnum
CREATE TYPE "booking_status" AS ENUM ('PENDING', 'BOOKED');

-- AlterTable
ALTER TABLE "consultations" ADD COLUMN     "booked_at" TIMESTAMP(3),
ADD COLUMN     "booking_status" "booking_status" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "google_event_id" TEXT,
ADD COLUMN     "meet_url" TEXT,
ADD COLUMN     "slot_end" TIMESTAMP(3),
ADD COLUMN     "slot_start" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "consultations_google_event_id_key" ON "consultations"("google_event_id");

-- CreateIndex
CREATE INDEX "consultations_booking_status_idx" ON "consultations"("booking_status");

-- CreateIndex
CREATE UNIQUE INDEX "consultations_slot_start_key" ON "consultations"("slot_start");
