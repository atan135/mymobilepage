import { Module } from '@nestjs/common'
import { AdminAnnouncementsService } from './admin-announcements.service'
import { AdminAnnouncementsController } from './admin-announcements.controller'

@Module({
  providers: [AdminAnnouncementsService],
  controllers: [AdminAnnouncementsController]
})
export class AdminAnnouncementsModule {}