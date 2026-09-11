import { Module } from '@nestjs/common'
import { ClientBannersController } from './client-banners.controller'

@Module({
  controllers: [ClientBannersController]
})
export class ClientBannersModule {}
