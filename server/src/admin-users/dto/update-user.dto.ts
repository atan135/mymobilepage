import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator'

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  nickname?: string

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string

  @IsOptional()
  @IsIn([0, 1])
  status?: number
}