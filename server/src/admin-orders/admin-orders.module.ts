import { Module } from '@nestjs/common'
import { AdminOrdersService } from './admin-orders.service'
import { AdminOrdersController } from './admin-orders.controller'

@Module({
  providers: [AdminOrdersService],
  controllers: [AdminOrdersController]
})
export class AdminOrdersModule {}
