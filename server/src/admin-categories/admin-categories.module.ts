import { Module } from '@nestjs/common'
import { AdminCategoriesService } from './admin-categories.service'
import { AdminCategoriesController } from './admin-categories.controller'

@Module({
  providers: [AdminCategoriesService],
  controllers: [AdminCategoriesController]
})
export class AdminCategoriesModule {}