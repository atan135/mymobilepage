import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator'

export class CreateAnnouncementDto {
  @IsString()
  @MaxLength(128)
  title!: string

  @IsString()
  @MaxLength(5000)
  content!: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  link?: string

  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number

  @IsOptional()
  @IsIn([0, 1])
  status?: number
}

export class UpdateAnnouncementDto {
  @IsOptional() @IsString() @MaxLength(128) title?: string
  @IsOptional() @IsString() @MaxLength(5000) content?: string
  @IsOptional() @IsString() @MaxLength(500) link?: string
  @IsOptional() @IsInt() @Min(0) sort?: number
  @IsOptional() @IsIn([0, 1]) status?: number
}