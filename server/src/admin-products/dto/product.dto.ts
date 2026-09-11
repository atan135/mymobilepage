import { Type } from 'class-transformer'
import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength
} from 'class-validator'

export class CreateProductDto {
  @IsString()
  @MinLength(2)
  @MaxLength(128)
  title!: string

  @IsNumber()
  @Min(0)
  price!: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  originalPrice?: number

  @IsString()
  @MaxLength(500)
  cover!: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[]

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number

  @IsOptional()
  @IsIn([0, 1])
  status?: number

  @IsInt()
  @Min(1)
  categoryId!: number
}

export class UpdateProductDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(128) title?: string
  @IsOptional() @IsNumber() @Min(0) price?: number
  @IsOptional() @IsNumber() @Min(0) originalPrice?: number
  @IsOptional() @IsString() @MaxLength(500) cover?: string
  @IsOptional() @IsArray() @IsString({ each: true }) images?: string[]
  @IsOptional() @IsString() description?: string
  @IsOptional() @IsInt() @Min(0) stock?: number
  @IsOptional() @IsIn([0, 1]) status?: number
  @IsOptional() @IsInt() @Min(1) categoryId?: number
}

export class UpdateProductStatusDto {
  @IsIn([0, 1])
  status!: number
}

export class UpdateProductStockDto {
  @IsInt()
  @Min(0)
  stock!: number
}

export class QueryProductDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) categoryId?: number
  @IsOptional() @Type(() => Number) @IsIn([0, 1]) status?: number
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minPrice?: number
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) maxPrice?: number
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pageSize?: number = 10
  @IsOptional() @IsString() @MaxLength(64) keyword?: string
}