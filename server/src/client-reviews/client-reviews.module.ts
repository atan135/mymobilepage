import { Module } from '@nestjs/common'
import { PassportModule } from '@nestjs/passport'
import { AuthModule } from '../auth/auth.module'
import { ClientReviewsController } from './client-reviews.controller'
import { ClientReviewsService } from './client-reviews.service'

@Module({
  imports: [AuthModule, PassportModule.register({ defaultStrategy: 'jwt' })],
  providers: [ClientReviewsService],
  controllers: [ClientReviewsController]
})
export class ClientReviewsModule {}
