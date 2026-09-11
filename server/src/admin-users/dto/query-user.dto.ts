import { Type } from 'class-transformer'
import { IsInt, IsOptional, Min } from 'class-validator'
import { PaginationDto } from '../../common/dto/pagination.dto'

export class QueryUserDto extends PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  status?: number
}