-- Review reports and moderation (hide a review), the company's own contact details,
-- and the "verified" badge staff give a place.
-- CreateEnum
CREATE TYPE "ReviewReportReason" AS ENUM ('SPAM', 'OFFENSIVE', 'FALSE_INFO', 'PERSONAL_INFO', 'OTHER');

-- CreateEnum
CREATE TYPE "ReviewReportStatus" AS ENUM ('OPEN', 'ACTION_TAKEN', 'DISMISSED');

-- AlterTable
ALTER TABLE "internship_places" ADD COLUMN     "apply_email" TEXT,
ADD COLUMN     "contact_phone" TEXT,
ADD COLUMN     "intake_period" TEXT,
ADD COLUMN     "is_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "verified_at" TIMESTAMP(3),
ADD COLUMN     "verified_by_core_user_id" TEXT,
ADD COLUMN     "website_url" TEXT;

-- AlterTable
ALTER TABLE "place_reviews" ADD COLUMN     "hidden_at" TIMESTAMP(3),
ADD COLUMN     "hidden_by_core_user_id" TEXT,
ADD COLUMN     "hidden_reason" TEXT,
ADD COLUMN     "is_hidden" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "review_reports" (
    "id" TEXT NOT NULL,
    "review_id" TEXT NOT NULL,
    "core_user_id" TEXT NOT NULL,
    "reason" "ReviewReportReason" NOT NULL,
    "detail" TEXT,
    "status" "ReviewReportStatus" NOT NULL DEFAULT 'OPEN',
    "resolved_at" TIMESTAMP(3),
    "resolved_by_core_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "review_reports_review_id_core_user_id_idx" ON "review_reports"("review_id", "core_user_id");

-- CreateIndex
CREATE INDEX "review_reports_status_idx" ON "review_reports"("status");

-- AddForeignKey
ALTER TABLE "review_reports" ADD CONSTRAINT "review_reports_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "place_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
