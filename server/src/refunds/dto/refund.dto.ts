import { Type } from 'class-transformer'
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min
} from 'class-validator'

export class CreateRefundDto {
  @IsInt()
  @Min(1)
  orderId!: number

  @IsString()
  @MaxLength(500)
  reason!: string

  @IsNumber()
  @Min(0.01)
  amount!: number
}

export class QueryMyRefundDto {
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
