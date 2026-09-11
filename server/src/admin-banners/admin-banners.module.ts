import { Module } from '@nestjs/common'
import { AdminBannersService } from './admin-banners.service'
import { AdminBannersController } from './admin-banners.controller'

@Module({
  providers: [AdminBannersService],
  controllers: [AdminBannersController]
})
export class AdminBannersModule {}