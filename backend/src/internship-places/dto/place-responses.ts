/**
 * Response shapes of the internship place API. They are classes (not
 * interfaces) so the Swagger plugin can describe them in openapi.json, from
 * which the frontend generates its types (tech-stack.md 3).
 */

export class PlaceTagDto {
  /** Stored value: a preset key (`web`) or the words of a field users added. */
  key!: string;
  /** Label shown on the page, e.g. `Web Development`. */
  label!: string;
  /** From the preset list (true) or added by users (false). */
  preset!: boolean;
  /** Places listing this field of work. */
  placeCount!: number;
}

export class ProvinceDto {
  /** Thai province name without the word "จังหวัด". */
  name!: string;
  placeCount!: number;
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
  /** Keys from GET /api/v1/internship-places/tags (preset keys or users' own words). */
  tags!: string[];
  /** The company's website, http(s). */
  websiteUrl!: string | null;
  /** Digits only, with an optional leading +. */
  contactPhone!: string | null;
  /** Where applications go. */
  applyEmail!: string | null;
  /** When the place takes interns, in words. */
  intakePeriod!: string | null;
  /** Staff checked that the place exists and takes CS interns. */
  isVerified!: boolean;
  verifiedAt!: Date | null;
  /** Average score of the visible reviews, rounded to one decimal; 0 without reviews. */
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
  /** null when the reviewer gave a score only. */
  comment!: string | null;
  position!: string | null;
  /** Buddhist-era year of the internship. */
  internshipYear!: number | null;
  /** Whether the caller wrote this review. */
  isMine!: boolean;
  /**
   * Hidden by a moderator. Only its author and moderators ever get a hidden
   * review; it counts in no score.
   */
  isHidden!: boolean;
  /** Why it was hidden - to its author and moderators only. */
  hiddenReason!: string | null;
  /** Whether the caller already has an open report on it. */
  isReportedByMe!: boolean;
  /** Open reports on it - returned to moderators (place-review:moderate) only. */
  openReportCount?: number;
  /** Reviewer's student or staff code - returned to staff (place-review:delete:any) only. */
  personCode?: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}

/** One of the caller's own reviews, with the place it is about. */
export class MyReviewDto extends ReviewViewDto {
  placeId!: string;
  placeName!: string;
  /** Thai province name without the word "จังหวัด". */
  placeProvince!: string;
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

/** A report in the moderators' queue, with the review and the place it is about. */
export class ReviewReportViewDto {
  id!: string;
  /** SPAM, OFFENSIVE, FALSE_INFO, PERSONAL_INFO or OTHER. */
  reason!: string;
  detail!: string | null;
  /** OPEN, ACTION_TAKEN or DISMISSED. */
  status!: string;
  /** Reports on the same review, this one included. */
  reviewReportCount!: number;
  placeId!: string;
  placeName!: string;
  review!: ReviewViewDto;
  resolvedAt!: Date | null;
  createdAt!: Date;
}

export class DeletedDto {
  id!: string;
  deleted!: true;
}
