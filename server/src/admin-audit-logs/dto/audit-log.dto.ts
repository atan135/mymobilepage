import { Type } from 'class-transformer'
import { IsDateString, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator'

export class QueryAuditLogDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  adminId?: number

  @IsOptional()
  @IsString()
  @MaxLength(64)
  resource?: string

  @IsOptional()
  @IsString()
  @MaxLength(64)
  action?: string

  @IsOptional()
  @IsDateString()
  dateFrom?: string

  @IsOptional()
  @IsDateString()
  dateTo?: string

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
