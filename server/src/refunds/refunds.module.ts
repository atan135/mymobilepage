import { Module } from '@nestjs/common'
import { PassportModule } from '@nestjs/passport'
import { AuthModule } from '../auth/auth.module'
import { RefundsController } from './refunds.controller'
import { RefundsService } from './refunds.service'

@Module({
  imports: [AuthModule, PassportModule.register({ defaultStrategy: 'jwt' })],
  providers: [RefundsService],
  controllers: [RefundsController]
})
export class RefundsModule {}
