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
import { AdminAnnouncementsService } from './admin-announcements.service'
import {
  CreateAnnouncementDto,
  UpdateAnnouncementDto
} from './dto/announcement.dto'

@Controller('admin/announcements')
export class AdminAnnouncementsController {
  constructor(private readonly svc: AdminAnnouncementsService) {}

  @RequirePermission('announcement:list')
  @Get()
  list() {
    return this.svc.list()
  }

  @RequirePermission('announcement:list')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findOne(id)
  }

  @RequirePermission('announcement:create')
  @Post()
  create(@Body() dto: CreateAnnouncementDto) {
    return this.svc.create(dto)
  }

  @RequirePermission('announcement:edit')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAnnouncementDto
  ) {
    return this.svc.update(id, dto)
  }

  @RequirePermission('announcement:publish')
  @Patch(':id/publish')
  publish(@Param('id', ParseIntPipe) id: number) {
    return this.svc.publish(id)
  }

  @RequirePermission('announcement:publish')
  @Patch(':id/unpublish')
  unpublish(@Param('id', ParseIntPipe) id: number) {
    return this.svc.unpublish(id)
  }

  @RequirePermission('announcement:delete')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id)
  }
}