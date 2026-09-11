import { Type } from 'class-transformer'
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min
} from 'class-validator'

/**
 * 订单状态枚举（与 schema 对齐）：
 *   0 PENDING    待付款
 *   1 PAID       已付款 / 待发货
 *   2 SHIPPED    已发货 / 待收货
 *   3 COMPLETED  已完成
 *   4 CANCELLED  已取消
 */
export const ORDER_STATUSES = [0, 1, 2, 3, 4] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  0: '待付款',
  1: '待发货',
  2: '已发货',
  3: '已完成',
  4: '已取消'
}

/** 状态机：状态 → 允许的目标状态集合 */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  0: [1, 4],
  1: [2, 4],
  2: [3],
  3: [],
  4: []
}

export class QueryOrderDto {
  @IsOptional()
  @Type(() => Number)
  @IsIn(ORDER_STATUSES as unknown as number[])
  status?: OrderStatus

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
  pageSize?: number = 10
}

export class UpdateOrderStatusDto {
  @IsIn(ORDER_STATUSES as unknown as number[])
  status!: OrderStatus
}

export class ShipOrderDto {
  @IsString()
  @MaxLength(64)
  shipCompany!: string

  @IsString()
  @MaxLength(64)
  shipNo!: string
}
