import { Module } from '@nestjs/common'
import { AdminCouponsController } from './admin-coupons.controller'
import { AdminCouponsService } from './admin-coupons.service'

@Module({
  providers: [AdminCouponsService],
  controllers: [AdminCouponsController]
})
export class AdminCouponsModule {}
