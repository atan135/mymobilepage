import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards
} from '@nestjs/common'
import { RequirePermission } from '../admin-auth/decorators/require-permission.decorator'
import { AdminBannersService } from './admin-banners.service'
import { CreateBannerDto, UpdateBannerDto } from './dto/banner.dto'

@Controller('admin/banners')
export class AdminBannersController {
  constructor(private readonly svc: AdminBannersService) {}

  @RequirePermission('banner:list')
  @Get()
  list() {
    return this.svc.list()
  }

  @RequirePermission('banner:list')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findOne(id)
  }

  @RequirePermission('banner:create')
  @Post()
  create(@Body() dto: CreateBannerDto) {
    return this.svc.create(dto)
  }

  @RequirePermission('banner:edit')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBannerDto
  ) {
    return this.svc.update(id, dto)
  }

  @RequirePermission('banner:delete')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id)
  }
}