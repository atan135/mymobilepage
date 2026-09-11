import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query
} from '@nestjs/common'
import { RequirePermission } from '../admin-auth/decorators/require-permission.decorator'
import { AdminReviewsService } from './admin-reviews.service'
import { QueryReviewDto, ReplyReviewDto } from './dto/review.dto'

@Controller('admin/reviews')
export class AdminReviewsController {
  constructor(private readonly svc: AdminReviewsService) {}

  @RequirePermission('review:list')
  @Get()
  list(@Query() q: QueryReviewDto) {
    return this.svc.list(q)
  }

  @RequirePermission('review:detail')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findOne(id)
  }

  @RequirePermission('review:approve')
  @Patch(':id/approve')
  approve(@Param('id', ParseIntPipe) id: number) {
    return this.svc.approve(id)
  }

  @RequirePermission('review:block')
  @Patch(':id/block')
  block(@Param('id', ParseIntPipe) id: number) {
    return this.svc.block(id)
  }

  @RequirePermission('review:reply')
  @Patch(':id/reply')
  reply(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReplyReviewDto
  ) {
    return this.svc.reply(id, dto)
  }
}
