import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator'

export class CreateBannerDto {
  @IsString()
  @MaxLength(500)
  image!: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  link?: string

  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number

  @IsOptional()
  @IsBoolean()
  enabled?: boolean
}

export class UpdateBannerDto {
  @IsOptional() @IsString() @MaxLength(500) image?: string
  @IsOptional() @IsString() @MaxLength(500) link?: string
  @IsOptional() @IsInt() @Min(0) sort?: number
  @IsOptional() @IsBoolean() enabled?: boolean
}