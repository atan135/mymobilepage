import { Type } from 'class-transformer'
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min
} from 'class-validator'
import { REVIEW_RATINGS } from '../../admin-reviews/dto/review.dto'

export class CreateReviewDto {
  @IsInt()
  @Min(1)
  orderId!: number

  @IsInt()
  @Min(1)
  productId!: number

  @IsInt()
  @Min(1)
  @Type(() => Number)
  rating!: (typeof REVIEW_RATINGS)[number] // 1..5

  @IsString()
  @MaxLength(1000)
  content!: string

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(9)
  @IsUrl({}, { each: true })
  images?: string[]
}