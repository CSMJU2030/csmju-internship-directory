import { IsOptional, IsString, Length } from 'class-validator';

/**
 * The company's own contact details, shared by POST and PATCH. Each is
 * optional; an empty text clears it. The service checks the format of what
 * is left after trimming (URL, phone digits, email) - a person's own phone
 * or email does not belong here (reference-data.md 8).
 */
export class PlaceContactDto {
  /** Company website, http(s). */
  @IsOptional()
  @IsString({ message: 'websiteUrl ต้องเป็นข้อความ' })
  @Length(0, 200, { message: 'websiteUrl ยาวเกิน 200 ตัวอักษร' })
  websiteUrl?: string;

  /** Spaces, hyphens and brackets are dropped; stored as digits with an optional leading +. */
  @IsOptional()
  @IsString({ message: 'contactPhone ต้องเป็นข้อความ' })
  @Length(0, 30, { message: 'contactPhone ยาวเกิน 30 ตัวอักษร' })
  contactPhone?: string;

  /** Where applications go, e.g. hr@company.co.th. */
  @IsOptional()
  @IsString({ message: 'applyEmail ต้องเป็นข้อความ' })
  @Length(0, 120, { message: 'applyEmail ยาวเกิน 120 ตัวอักษร' })
  applyEmail?: string;

  /** When the place takes interns, e.g. "เปิดรับ ม.ค. - มี.ค. ทุกปี". */
  @IsOptional()
  @IsString({ message: 'intakePeriod ต้องเป็นข้อความ' })
  @Length(0, 120, { message: 'intakePeriod ยาวเกิน 120 ตัวอักษร' })
  intakePeriod?: string;
}
