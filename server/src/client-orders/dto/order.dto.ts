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
