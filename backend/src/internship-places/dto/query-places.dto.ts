import { Type } from 'class-transformer';
import { IsIn, IsInt, IsLatitude, IsLongitude, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export const PLACE_SORTS = ['rank', 'rating', 'allowance', 'reviews', 'distance', 'newest', 'name'] as const;
export type PlaceSort = (typeof PLACE_SORTS)[number];

export class QueryPlacesDto extends PaginationQueryDto {
  /** Matches the name, province, notes, work hours and review comments. */
  @IsOptional()
  @IsString()
  @Length(1, 100, { message: 'q ต้องยาว 1-100 ตัวอักษร' })
  q?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50, { message: 'province ต้องยาว 1-50 ตัวอักษร' })
  province?: string;

  @IsOptional()
  @IsIn(['paid', 'free'], { message: 'allowance ต้องเป็น paid หรือ free' })
  allowance?: 'paid' | 'free';

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'minRating ต้องเป็นจำนวนเต็ม 1-5' })
  @Min(1, { message: 'minRating ต้องเป็นจำนวนเต็ม 1-5' })
  @Max(5, { message: 'minRating ต้องเป็นจำนวนเต็ม 1-5' })
  minRating?: number;

  /** A preset key (`web`) or the words of a field of work users added. */
  @IsOptional()
  @IsString()
  @Length(1, 40, { message: 'tag ต้องยาว 1-40 ตัวอักษร' })
  tag?: string;

  /** Ranking (default), average score, allowance, review count, distance, newest or name. */
  @IsOptional()
  @IsIn(PLACE_SORTS as unknown as string[], { message: `sort ต้องเป็น ${PLACE_SORTS.join(', ')}` })
  sort?: PlaceSort;

  /** Measure `distanceKm` from here instead of the university (both or neither). */
  @IsOptional()
  @Type(() => Number)
  @IsLatitude({ message: 'nearLat ต้องเป็นละติจูดที่ถูกต้อง' })
  nearLat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsLongitude({ message: 'nearLng ต้องเป็นลองจิจูดที่ถูกต้อง' })
  nearLng?: number;
}
