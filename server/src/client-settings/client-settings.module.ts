import { Module } from '@nestjs/common'
import { ClientSettingsController } from './client-settings.controller'
import { ClientSettingsService } from './client-settings.service'

@Module({
  providers: [ClientSettingsService],
  controllers: [ClientSettingsController]
})
export class ClientSettingsModule {}
