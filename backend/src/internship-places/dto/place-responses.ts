/**
 * Response shapes of the internship place API. They are classes (not
 * interfaces) so the Swagger plugin can describe them in openapi.json, from
 * which the frontend generates its types (tech-stack.md 3).
 */

export class PlaceTagDto {
  /** Stored value, e.g. `web`. */
  key!: string;
  /** Label shown on the page, e.g. `Web Development`. */
  label!: string;
}

export class PlaceSummaryDto {
  id!: string;
  name!: string;
  /** Thai province name without the word "จังหวัด". */
  province!: string;
  latitude!: number;
  longitude!: number;
  /** Daily allowance in satang; 0 = none. */
  dailyAllowanceSatang!: number;
  workHours!: string | null;
  /** Things to watch out for and benefits. */
  notes!: string;
  /** Keys from GET /api/v1/internship-places/tags. */
  tags!: string[];
  /** Average review score rounded to one decimal; 0 without reviews. */
  averageScore!: number;
  reviewCount!: number;
  /** Position in the ranking of the whole directory (1 = best). */
  rank!: number;
  /** From the university, or from nearLat/nearLng when the list was asked with them. */
  distanceKm!: number;
  createdAt!: Date;
  updatedAt!: Date;
}

/** A review as the API returns it - the author is never named. */
export class ReviewViewDto {
  id!: string;
  /** 1-5 stars. */
  score!: number;
  comment!: string;
  position!: string | null;
  /** Buddhist-era year of the internship. */
  internshipYear!: number | null;
  /** Whether the caller wrote this review. */
  isMine!: boolean;
  /** Reviewer's student or staff code - returned to staff (place-review:delete:any) only. */
  personCode?: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class ScoreDistributionDto {
  '1'!: number;
  '2'!: number;
  '3'!: number;
  '4'!: number;
  '5'!: number;
}

export class PlaceDetailDto extends PlaceSummaryDto {
  /** Number of reviews per score. */
  scoreDistribution!: ScoreDistributionDto;
  /** Newest first. */
  reviews!: ReviewViewDto[];
  /** The caller's own review of this place, if any. */
  myReviewId!: string | null;
}

export class DeletedDto {
  id!: string;
  deleted!: true;
}
