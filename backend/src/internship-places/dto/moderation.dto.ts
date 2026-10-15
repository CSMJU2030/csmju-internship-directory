import { IsBoolean, IsIn, IsOptional, IsString, Length } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export const REPORT_REASONS = ['SPAM', 'OFFENSIVE', 'FALSE_INFO', 'PERSONAL_INFO', 'OTHER'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_STATUSES = ['OPEN', 'ACTION_TAKEN', 'DISMISSED'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

/** The reporter comes from the verified token; one open report per person per review. */
export class CreateReportDto {
  /** SPAM, OFFENSIVE, FALSE_INFO (not true), PERSONAL_INFO (names someone) or OTHER. */
  @IsIn(REPORT_REASONS as unknown as string[], { message: `reason ต้องเป็น ${REPORT_REASONS.join(', ')}` })
  reason!: ReportReason;

  /** Optional words from the reporter. */
  @IsOptional()
  @IsString({ message: 'detail ต้องเป็นข้อความ' })
  @Length(0, 300, { message: 'detail ยาวเกิน 300 ตัวอักษร' })
  detail?: string;
}

/** Hide a review (its open reports become ACTION_TAKEN) or show it again / keep it (they become DISMISSED). */
export class SetReviewVisibilityDto {
  @IsBoolean({ message: 'isHidden ต้องเป็น true หรือ false' })
  isHidden!: boolean;

  /** Why it is hidden - its author sees this. Ignored when showing the review. */
  @IsOptional()
  @IsString({ message: 'reason ต้องเป็นข้อความ' })
  @Length(0, 200, { message: 'reason ยาวเกิน 200 ตัวอักษร' })
  reason?: string;
}

export class SetVerificationDto {
  @IsBoolean({ message: 'isVerified ต้องเป็น true หรือ false' })
  isVerified!: boolean;
}

export class QueryReportsDto extends PaginationQueryDto {
  /** OPEN (default), ACTION_TAKEN or DISMISSED. */
  @IsOptional()
  @IsIn(REPORT_STATUSES as unknown as string[], { message: `status ต้องเป็น ${REPORT_STATUSES.join(', ')}` })
  status?: ReportStatus;
}
