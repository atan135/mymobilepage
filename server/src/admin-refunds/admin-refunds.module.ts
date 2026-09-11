import { Module } from '@nestjs/common'
import { AdminRefundsController } from './admin-refunds.controller'
import { AdminRefundsService } from './admin-refunds.service'

@Module({
  providers: [AdminRefundsService],
  controllers: [AdminRefundsController]
})
export class AdminRefundsModule {}
