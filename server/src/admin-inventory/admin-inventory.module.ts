import { Module } from '@nestjs/common'
import { AdminInventoryController } from './admin-inventory.controller'
import { AdminInventoryService } from './admin-inventory.service'

@Module({
  providers: [AdminInventoryService],
  controllers: [AdminInventoryController]
})
export class AdminInventoryModule {}
