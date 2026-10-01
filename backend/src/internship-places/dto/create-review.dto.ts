import { IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

/** The reviewer comes from the verified token; one review per person per place. */
export class CreateReviewDto {
  @IsInt({ message: 'score ต้องเป็นจำนวนเต็ม 1-5' })
  @Min(1, { message: 'score ต้องเป็นจำนวนเต็ม 1-5' })
  @Max(5, { message: 'score ต้องเป็นจำนวนเต็ม 1-5' })
  score!: number;

  @IsString({ message: 'comment ต้องเป็นข้อความ' })
  @Length(5, 1000, { message: 'comment ต้องยาว 5-1,000 ตัวอักษร' })
  comment!: string;

  /** Job title during the internship, e.g. "Frontend Developer Intern". */
  @IsOptional()
  @IsString({ message: 'position ต้องเป็นข้อความ' })
  @Length(0, 60, { message: 'position ยาวเกิน 60 ตัวอักษร' })
  position?: string;

  /** Buddhist-era year; the service rejects a year after next year. */
  @IsOptional()
  @IsInt({ message: 'internshipYear ต้องเป็นปี พ.ศ.' })
  @Min(2540, { message: 'internshipYear ต้องเป็นปี พ.ศ. ตั้งแต่ 2540' })
  internshipYear?: number;
}
