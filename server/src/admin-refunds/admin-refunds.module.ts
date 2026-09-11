import { Module } from '@nestjs/common'
import { InventoryModule } from '../inventory/inventory.module'
import { AdminRefundsController } from './admin-refunds.controller'
import { AdminRefundsService } from './admin-refunds.service'

@Module({
  imports: [InventoryModule],
  providers: [AdminRefundsService],
  controllers: [AdminRefundsController]
})
export class AdminRefundsModule {}
