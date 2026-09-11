import { Type } from 'class-transformer'
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested
} from 'class-validator'

/**
 * 客户端下单收货人结构。
 * 每次下单必填，不维护地址簿（地址簿放到 Phase 2 再做）。
 */
export class ReceiverDto {
  @IsString()
  @MaxLength(32)
  name!: string

  @IsString()
  @MaxLength(20)
  phone!: string

  @IsString()
  @MaxLength(200)
  address!: string
}

export class CreateOrderItemDto {
  @IsInt()
  @Min(1)
  productId!: number

  @IsInt()
  @Min(1)
  quantity!: number
}

export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[]

  @ValidateNested()
  @Type(() => ReceiverDto)
  receiver!: ReceiverDto

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string

  /**
   * 可选：使用 UserCoupon.id（不是 coupons.id，是 user_coupons.id）。
   * 服务端会校验归属 + 未使用 + 未过期，并按 coupon.type 计算折扣。
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  couponId?: number
}

export class QueryMyOrderDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
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
