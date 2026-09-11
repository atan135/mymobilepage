import { Type } from 'class-transformer'
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min
} from 'class-validator'

export const REVIEW_STATUSES = [0, 1, 2] as const
export type ReviewStatus = (typeof REVIEW_STATUSES)[number]

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  0: '待审',
  1: '已通过',
  2: '已屏蔽'
}

export const REVIEW_RATINGS = [1, 2, 3, 4, 5] as const
export type ReviewRating = (typeof REVIEW_RATINGS)[number]

export const REVIEW_TRANSITIONS: Record<ReviewStatus, ReviewStatus[]> = {
  0: [1, 2],
  1: [2],
  2: [1]
}

export class QueryReviewDto {
  @IsOptional()
  @Type(() => Number)
  @IsIn(REVIEW_STATUSES as unknown as number[])
  status?: ReviewStatus

  @IsOptional()
  @Type(() => Number)
  @IsIn(REVIEW_RATINGS as unknown as number[])
  rating?: ReviewRating

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

export class ReplyReviewDto {
  /**
   * 空字符串视为清除回复
   */
  @IsString()
  @MaxLength(1000)
  reply!: string
}
