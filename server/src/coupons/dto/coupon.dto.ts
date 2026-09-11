import { Type } from 'class-transformer'
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  Min,
  ValidateNested
} from 'class-validator'

/**
 * 试算入参：商品列表 + 可选 couponId。
 * 无 couponId 时只返回 originalAmount / totalAmount。
 */
export class PreviewItemDto {
  @IsInt()
  @Min(1)
  productId!: number

  @IsInt()
  @Min(1)
  quantity!: number
}

export class PreviewCouponDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PreviewItemDto)
  items!: PreviewItemDto[]

  @IsOptional()
  @IsInt()
  @Min(1)
  couponId?: number
}

export class QueryMyCouponDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  /** 0 未使用 / 1 已使用 / 2 已过期 */
  status?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 10
}
