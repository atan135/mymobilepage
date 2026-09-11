import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards
} from '@nestjs/common'
import { RequirePermission } from '../admin-auth/decorators/require-permission.decorator'
import { AdminOrdersService } from './admin-orders.service'
import {
  QueryOrderDto,
  ShipOrderDto,
  UpdateOrderStatusDto
} from './dto/order.dto'

@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly svc: AdminOrdersService) {}

  @RequirePermission('order:list')
  @Get()
  list(@Query() q: QueryOrderDto) {
    return this.svc.list(q)
  }

  @RequirePermission('order:detail')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findOne(id)
  }

  /**
   * 通用状态切换（取消等场景）。不带发货信息。
   * 仅允许沿着状态机表里登记的边切换。
   */
  @RequirePermission('order:cancel')
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto
  ) {
    return this.svc.updateStatus(id, dto)
  }

  /**
   * 发货：PAID → SHIPPED，录入物流公司与单号。
   * 已发货订单允许覆盖运单。
   */
  @RequirePermission('order:ship')
  @Patch(':id/ship')
  ship(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ShipOrderDto
  ) {
    return this.svc.ship(id, dto)
  }
}
