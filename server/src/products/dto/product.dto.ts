import { Type } from 'class-transformer'
import {
  IsArray,
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

  @IsInt()
  @Min(1)
  categoryId!: number
}

export class UpdateProductDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(128) title?: string
  @IsOptional() @IsNumber() @Min(0) price?: number
  @IsOptional() @IsNumber() @Min(0) originalPrice?: number
  @IsOptional() @IsString() cover?: string
  @IsOptional() @IsArray() @IsString({ each: true }) images?: string[]
  @IsOptional() @IsString() description?: string
  @IsOptional() @IsInt() @Min(0) stock?: number
  @IsOptional() @IsInt() @Min(1) categoryId?: number
}

export class QueryProductDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number
}