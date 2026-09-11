import { Body, Controller, Get, Put } from '@nestjs/common'
import { RequirePermission } from '../admin-auth/decorators/require-permission.decorator'
import { AdminSettingsService } from './admin-settings.service'
import { UpdateSettingsDto } from './dto/setting.dto'

@Controller('admin/settings')
export class AdminSettingsController {
  constructor(private readonly svc: AdminSettingsService) {}

  @RequirePermission('setting:edit')
  @Get()
  list() {
    return this.svc.list()
  }

  @RequirePermission('setting:edit')
  @Put()
  bulkUpsert(@Body() dto: UpdateSettingsDto) {
    return this.svc.bulkUpsert(dto.updates)
  }
}
