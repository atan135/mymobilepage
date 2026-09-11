import { Module } from '@nestjs/common'
import { AdminAuditLogsController } from './admin-audit-logs.controller'
import { AdminAuditLogsService } from './admin-audit-logs.service'

@Module({
  providers: [AdminAuditLogsService],
  controllers: [AdminAuditLogsController]
})
export class AdminAuditLogsModule {}
