import { Module } from '@nestjs/common'
import { AdminReviewsController } from './admin-reviews.controller'
import { AdminReviewsService } from './admin-reviews.service'

@Module({
  providers: [AdminReviewsService],
  controllers: [AdminReviewsController]
})
export class AdminReviewsModule {}
