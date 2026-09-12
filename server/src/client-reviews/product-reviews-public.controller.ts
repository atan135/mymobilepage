import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query
} from '@nestjs/common'
import { ClientReviewsService } from './client-reviews.service'

/**
 * 公开评价接口（不走 JwtAuthGuard）。
 * - 路径 /products/:productId/reviews，配合 server 全局前缀 /api
 *   → 完整路径 /api/products/:productId/reviews
 * - 只暴露 status=1（已通过）的评价 + 平均分聚合
 * - 与 ClientReviewsController（/reviews，需登录）独立，不冲突
 */
@Controller('products')
export class ProductReviewsPublicController {
  constructor(private readonly svc: ClientReviewsService) {}

  @Get(':productId/reviews')
  list(
    @Param('productId', ParseIntPipe) productId: number,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ) {
    return this.svc.listByProduct(
      productId,
      page ? Number(page) : 1,
      pageSize ? Number(pageSize) : 10
    )
  }
}
