import { Body, Controller, Get, Put, Req } from '@nestjs/common'
import type { Request } from 'express'
import { RequirePermission } from '../admin-auth/decorators/require-permission.decorator'
import { AdminSettingsService } from './admin-settings.service'
import { UpdateSettingsDto } from './dto/setting.dto'

@Controller('admin/settings')
export class AdminSettingsController {
  constructor(private readonly svc: AdminSettingsService) {}

  @RequirePermission('setting:list')
  @Get()
  list() {
    return this.svc.list()
  }

  // 入口放行只要持任意一个 setting:{group}:edit 即可；
  // service 层再做 per-key group 校验, 防止 operator 用 site 权限写 payment_* key。
  @RequirePermission(
    'setting:site:edit',
    'setting:customer_service:edit',
    'setting:payment:edit',
    'setting:shipping:edit',
    'setting:general:edit'
  )
  @Put()
  bulkUpsert(
    @Body() dto: UpdateSettingsDto,
    @Req() req: Request & { user: { permissions: string[] } }
  ) {
    return this.svc.bulkUpsert(dto.updates, req.user.permissions)
  }
}
