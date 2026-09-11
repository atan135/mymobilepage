import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { ClientOrdersService } from './client-orders.service'
import { ClientOrdersController } from './client-orders.controller'

@Module({
  imports: [AuthModule],
  providers: [ClientOrdersService],
  controllers: [ClientOrdersController]
})
export class ClientOrdersModule {}
