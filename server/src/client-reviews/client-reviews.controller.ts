import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards
} from '@nestjs/common'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import type { JwtPayload } from '../auth/auth.service'
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard'
import { ClientReviewsService } from './client-reviews.service'
import { CreateReviewDto } from './dto/create-review.dto'
import {
  REVIEW_STATUSES,
  type ReviewStatus
} from '../admin-reviews/dto/review.dto'

/**
 * 前台评价接口。所有端点都要求登录。
 * - 路径 /reviews，配合 server 全局前缀 /api → 完整路径 /api/reviews
 * - 与后台 AdminReviewsController（/admin/reviews）独立命名空间，不冲突
 */
@UseGuards(JwtAuthGuard)
@Controller('reviews')
export class ClientReviewsController {
  constructor(private readonly svc: ClientReviewsService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateReviewDto) {
    return this.svc.create(user.sub, dto)
  }

  @Get('my')
  listMy(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ) {
    const s = status !== undefined ? (Number(status) as ReviewStatus) : undefined
    return this.svc.listMy(user.sub, {
      status: REVIEW_STATUSES.includes(s as never) ? s : undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined
    })
  }

  @Get('can-review/:orderId')
  canReview(
    @CurrentUser() user: JwtPayload,
    @Param('orderId', ParseIntPipe) orderId: number
  ) {
    return this.svc.getCanReview(user.sub, orderId)
  }
}
