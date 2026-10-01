-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "internship_places" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_key" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "daily_allowance_satang" INTEGER NOT NULL DEFAULT 0,
    "work_hours" TEXT,
    "notes" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_by_core_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "internship_places_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "place_reviews" (
    "id" TEXT NOT NULL,
    "place_id" TEXT NOT NULL,
    "core_user_id" TEXT NOT NULL,
    "person_code" TEXT,
    "score" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "position" TEXT,
    "internship_year" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "place_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "internship_places_name_key_key" ON "internship_places"("name_key");

-- CreateIndex
CREATE INDEX "internship_places_province_idx" ON "internship_places"("province");

-- CreateIndex
CREATE INDEX "place_reviews_core_user_id_idx" ON "place_reviews"("core_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "place_reviews_place_id_core_user_id_key" ON "place_reviews"("place_id", "core_user_id");

-- AddForeignKey
ALTER TABLE "place_reviews" ADD CONSTRAINT "place_reviews_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "internship_places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

