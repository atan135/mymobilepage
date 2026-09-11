import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards
} from '@nestjs/common'
import { AdminUsersService } from './admin-users.service'
import { QueryUserDto } from './dto/query-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { RequirePermission } from '../admin-auth/decorators/require-permission.decorator'

@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly svc: AdminUsersService) {}

  @RequirePermission('user:list')
  @Get()
  list(@Query() q: QueryUserDto) {
    return this.svc.list(q)
  }

  @RequirePermission('user:detail')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findOne(id)
  }

  @RequirePermission('user:edit')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto
  ) {
    return this.svc.update(id, dto)
  }
}