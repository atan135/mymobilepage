import { Module } from '@nestjs/common'
import { InventoryModule } from '../inventory/inventory.module'
import { AdminProductsService } from './admin-products.service'
import { AdminProductsController } from './admin-products.controller'

@Module({
  imports: [InventoryModule],
  providers: [AdminProductsService],
  controllers: [AdminProductsController]
})
export class AdminProductsModule {}