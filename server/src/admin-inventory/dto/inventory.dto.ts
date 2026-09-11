import { Type } from 'class-transformer'
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator'
import { INVENTORY_TYPES } from '../../inventory/inventory.service'

export class QueryInventoryLogDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  productId?: number

  @IsOptional()
  @Type(() => Number)
  @IsIn(INVENTORY_TYPES as unknown as number[])
  type?: (typeof INVENTORY_TYPES)[number]

  @IsOptional()
  @IsString()
  @MaxLength(64)
  keyword?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 20
}

export class UpdateProductThresholdDto {
  @IsInt()
  @Min(0)
  threshold!: number
}
