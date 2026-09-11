import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import type { JwtPayload } from '../auth/auth.service'
import { ClientOrdersService } from './client-orders.service'
import {
  CreateOrderDto,
  QueryMyOrderDto
} from './dto/order.dto'

/**
 * 客户端订单接口。
 * - 所有端点都要求登录
 * - URL 用 /orders（不带 /admin），配合 server 全局前缀 /api
 *   → 完整路径 /api/orders
 */
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class ClientOrdersController {
  constructor(private readonly svc: ClientOrdersService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateOrderDto) {
    return this.svc.create(user.sub, dto)
  }

  @Get('my')
  listMy(
    @CurrentUser() user: JwtPayload,
    @Query() q: QueryMyOrderDto
  ) {
    return this.svc.listMy(user.sub, q)
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.svc.findOne(user.sub, id)
  }

  @Patch(':id/cancel')
  cancel(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.svc.cancel(user.sub, id)
  }

  @Post(':id/confirm-receipt')
  confirmReceipt(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.svc.confirmReceipt(user.sub, id)
  }
}
