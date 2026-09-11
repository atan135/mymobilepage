import { Module } from '@nestjs/common'
import { AdminSettingsController } from './admin-settings.controller'
import { AdminSettingsService } from './admin-settings.service'

@Module({
  providers: [AdminSettingsService],
  controllers: [AdminSettingsController]
})
export class AdminSettingsModule {}
