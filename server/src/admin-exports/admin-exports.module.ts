import { Module } from '@nestjs/common'
import { AdminExportsController } from './admin-exports.controller'
import { AdminExportsService } from './admin-exports.service'

@Module({
  providers: [AdminExportsService],
  controllers: [AdminExportsController]
})
export class AdminExportsModule {}
