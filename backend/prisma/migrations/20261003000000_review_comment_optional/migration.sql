-- A score alone is a review too: the text of a review becomes optional.
ALTER TABLE "place_reviews" ALTER COLUMN "comment" DROP NOT NULL;
