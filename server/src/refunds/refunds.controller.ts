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
import { RefundsService } from './refunds.service'
import { CreateRefundDto, QueryMyRefundDto } from './dto/refund.dto'

/**
 * 前台退款申请接口。所有端点都要求登录。
 * - URL 用 /refunds，配合 server 全局前缀 /api
 *   → 完整路径 /api/refunds
 */
@UseGuards(JwtAuthGuard)
@Controller('refunds')
export class RefundsController {
  constructor(private readonly svc: RefundsService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateRefundDto) {
    return this.svc.create(user.sub, dto)
  }

  @Get('my')
  listMy(@CurrentUser() user: JwtPayload, @Query() q: QueryMyRefundDto) {
    return this.svc.listMy(user.sub, q)
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.svc.findOne(user.sub, id)
  }
}
