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
import { CouponsService } from './coupons.service'
import { PreviewCouponDto, QueryMyCouponDto } from './dto/coupon.dto'

/**
 * 前台优惠券接口。
 * - 所有端点都要求登录
 * - URL 用 /coupons，配合 server 全局前缀 /api
 *   → 完整路径 /api/coupons
 */
@UseGuards(JwtAuthGuard)
@Controller('coupons')
export class CouponsController {
  constructor(private readonly svc: CouponsService) {}

  @Get('available')
  listAvailable(@CurrentUser() user: JwtPayload) {
    return this.svc.listAvailable(user.sub)
  }

  @Post(':id/claim')
  claim(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.svc.claim(user.sub, id)
  }

  @Get('mine')
  listMine(
    @CurrentUser() user: JwtPayload,
    @Query() q: QueryMyCouponDto
  ) {
    return this.svc.listMine(user.sub, q)
  }

  @Post('preview')
  preview(
    @CurrentUser() user: JwtPayload,
    @Body() dto: PreviewCouponDto
  ) {
    return this.svc.preview(user.sub, dto)
  }
}
