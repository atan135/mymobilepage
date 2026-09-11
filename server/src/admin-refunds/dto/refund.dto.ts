import { Type } from 'class-transformer'
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min
} from 'class-validator'

export const REFUND_STATUSES = [0, 1, 2, 3] as const
export type RefundStatus = (typeof REFUND_STATUSES)[number]

export const REFUND_STATUS_LABELS: Record<RefundStatus, string> = {
  0: '待审',
  1: '已批准',
  2: '已拒绝',
  3: '已退款'
}

export const REFUND_TRANSITIONS: Record<RefundStatus, RefundStatus[]> = {
  0: [1, 2],
  1: [3],
  2: [],
  3: []
}

export class QueryRefundDto {
  @IsOptional()
  @Type(() => Number)
  @IsIn(REFUND_STATUSES as unknown as number[])
  status?: RefundStatus

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

export class RejectRefundDto {
  @IsString()
  @MaxLength(500)
  remark!: string
}
