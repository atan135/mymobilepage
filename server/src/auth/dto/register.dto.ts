import { IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator'

export class RegisterDto {
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  username!: string

  @IsString()
  @MinLength(6)
  @MaxLength(64)
  password!: string

  @IsOptional()
  @IsString()
  @MaxLength(32)
  nickname?: string

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string

  @IsOptional()
  @IsUrl({ require_tld: false })
  avatar?: string
}