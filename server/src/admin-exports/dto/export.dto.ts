import { Type } from 'class-transformer'
import { IsDateString, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator'
import { ORDER_STATUSES } from '../../admin-orders/dto/order.dto'
import { INVENTORY_TYPES } from '../../inventory/inventory.service'

export class ExportOrdersDto {
  @IsOptional()
  @Type(() => Number)
  @IsIn(ORDER_STATUSES as unknown as number[])
  status?: number

  @IsOptional()
  @IsString()
  @MaxLength(64)
  keyword?: string

  @IsOptional()
  @IsDateString()
  dateFrom?: string

  @IsOptional()
  @IsDateString()
  dateTo?: string
}

export class ExportProductsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId?: number

  @IsOptional()
  @Type(() => Number)
  @IsIn([0, 1])
  status?: number

  @IsOptional()
  @IsString()
  @MaxLength(64)
  keyword?: string
}

export class ExportInventoryLogsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  productId?: number

  @IsOptional()
  @Type(() => Number)
  @IsIn(INVENTORY_TYPES as unknown as number[])
  type?: number

  @IsOptional()
  @IsString()
  @MaxLength(64)
  keyword?: string

  @IsOptional()
  @IsDateString()
  dateFrom?: string

  @IsOptional()
  @IsDateString()
  dateTo?: string
}
