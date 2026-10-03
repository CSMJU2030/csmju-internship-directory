import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { CUSTOM_TAG_LENGTH, MAX_TAGS_PER_PLACE } from '../tags';

/** 10,000 baht a day, in satang. */
export const MAX_DAILY_ALLOWANCE_SATANG = 1_000_000;

/**
 * Who adds the place comes from the verified token, never from the body - the
 * ValidationPipe's forbidNonWhitelisted rejects a smuggled coreUserId.
 */
export class CreatePlaceDto {
  @IsString({ message: 'name ต้องเป็นข้อความ' })
  @Length(2, 120, { message: 'name ต้องยาว 2-120 ตัวอักษร' })
  name!: string;

  /** Thai province name, e.g. "เชียงใหม่" (the word "จังหวัด" is dropped). */
  @IsString({ message: 'province ต้องเป็นข้อความ' })
  @Length(2, 50, { message: 'province ต้องยาว 2-50 ตัวอักษร' })
  province!: string;

  @IsLatitude({ message: 'latitude ต้องเป็นละติจูดที่ถูกต้อง' })
  latitude!: number;

  @IsLongitude({ message: 'longitude ต้องเป็นลองจิจูดที่ถูกต้อง' })
  longitude!: number;

  /** Integer satang; 0 when the place pays no allowance. */
  @IsOptional()
  @IsInt({ message: 'dailyAllowanceSatang ต้องเป็นจำนวนเต็ม (สตางค์)' })
  @Min(0, { message: 'dailyAllowanceSatang ต้องไม่ติดลบ' })
  @Max(MAX_DAILY_ALLOWANCE_SATANG, { message: 'dailyAllowanceSatang สูงเกิน 10,000 บาท' })
  dailyAllowanceSatang?: number;

  @IsOptional()
  @IsString({ message: 'workHours ต้องเป็นข้อความ' })
  @Length(0, 80, { message: 'workHours ยาวเกิน 80 ตัวอักษร' })
  workHours?: string;

  /** Things to watch out for and benefits. */
  @IsString({ message: 'notes ต้องเป็นข้อความ' })
  @Length(5, 600, { message: 'notes ต้องยาว 5-600 ตัวอักษร' })
  notes!: string;

  @IsOptional()
  @IsArray({ message: 'tags ต้องเป็นรายการ' })
  @ArrayMaxSize(MAX_TAGS_PER_PLACE, { message: `tags เลือกได้ไม่เกิน ${MAX_TAGS_PER_PLACE} รายการ` })
  @IsString({ each: true, message: 'tags ต้องเป็นข้อความ' })
  @Length(CUSTOM_TAG_LENGTH.min, CUSTOM_TAG_LENGTH.max, {
    each: true,
    message: `สายงานแต่ละรายการต้องยาว ${CUSTOM_TAG_LENGTH.min}-${CUSTOM_TAG_LENGTH.max} ตัวอักษร`,
  })
  tags?: string[];
}
