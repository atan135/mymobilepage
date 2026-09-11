import { Type } from 'class-transformer'
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min
} from 'class-validator'

export const COUPON_TYPES = [1, 2, 3] as const
export type CouponType = (typeof COUPON_TYPES)[number]

export const COUPON_TYPE_LABELS: Record<CouponType, string> = {
  1: '满减',
  2: '折扣',
  3: '无门槛'
}

export class CreateCouponDto {
  @IsString()
  @MaxLength(128)
  name!: string

  @IsIn(COUPON_TYPES as unknown as number[])
  type!: CouponType

  /**
   * 满减/折扣门槛（单位：元）。无门槛类型可不传，传了也忽略。
   */
  @IsOptional()
  @IsNumber()
  @Min(0)
  threshold?: number

  /**
   * type=1 满减：减多少元
   * type=2 折扣：百分比（85.5 表示 8.55 折）
   * type=3 无门槛：代金多少元
   */
  @IsNumber()
  @Min(0)
  amount!: number

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string

  @IsDateString()
  validFrom!: string

  @IsDateString()
  validTo!: string

  @IsInt()
  @Min(1)
  total!: number

  @IsOptional()
  @IsInt()
  @Min(1)
  perUserLimit?: number = 1

  @IsOptional()
  @IsIn([0, 1])
  status?: number = 1
}

export class UpdateCouponDto {
  @IsOptional() @IsString() @MaxLength(128) name?: string
  @IsOptional() @IsIn(COUPON_TYPES as unknown as number[]) type?: CouponType
  @IsOptional() @IsNumber() @Min(0) threshold?: number | null
  @IsOptional() @IsNumber() @Min(0) amount?: number
  @IsOptional() @IsString() @MaxLength(1000) description?: string
  @IsOptional() @IsDateString() validFrom?: string
  @IsOptional() @IsDateString() validTo?: string
  @IsOptional() @IsInt() @Min(1) total?: number
  @IsOptional() @IsInt() @Min(1) perUserLimit?: number
  @IsOptional() @IsIn([0, 1]) status?: number
}

export class UpdateCouponStatusDto {
  @IsIn([0, 1])
  status!: number
}

export class QueryCouponDto {
  @IsOptional() @IsString() @MaxLength(64) keyword?: string
  @IsOptional() @IsIn([0, 1]) status?: number
  @IsOptional() @Type(() => Number) @IsIn(COUPON_TYPES as unknown as number[]) type?: CouponType
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pageSize?: number = 10
}

export class QueryClaimsDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) status?: number
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) source?: number
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pageSize?: number = 10
}

export class GrantCouponDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Min(1, { each: true })
  userIds!: number[]
}
