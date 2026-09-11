import { Controller, Get, Query } from '@nestjs/common'
import { RequirePermission } from '../admin-auth/decorators/require-permission.decorator'
import { AdminAuditLogsService } from './admin-audit-logs.service'
import { QueryAuditLogDto } from './dto/audit-log.dto'

@Controller('admin/audit-logs')
export class AdminAuditLogsController {
  constructor(private readonly svc: AdminAuditLogsService) {}

  @RequirePermission('audit:view')
  @Get()
  list(@Query() q: QueryAuditLogDto) {
    return this.svc.list(q)
  }
}
