import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Req
} from '@nestjs/common'
import type { Request } from 'express'
import { RequirePermission } from '../admin-auth/decorators/require-permission.decorator'
import { AdminRefundsService } from './admin-refunds.service'
import { QueryRefundDto, RejectRefundDto } from './dto/refund.dto'

@Controller('admin/refunds')
export class AdminRefundsController {
  constructor(private readonly svc: AdminRefundsService) {}

  @RequirePermission('refund:list')
  @Get()
  list(@Query() q: QueryRefundDto) {
    return this.svc.list(q)
  }

  @RequirePermission('refund:detail')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findOne(id)
  }

  @RequirePermission('refund:approve')
  @Patch(':id/approve')
  approve(@Param('id', ParseIntPipe) id: number) {
    return this.svc.approve(id)
  }

  @RequirePermission('refund:reject')
  @Patch(':id/reject')
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectRefundDto
  ) {
    return this.svc.reject(id, dto)
  }

  @RequirePermission('refund:refund')
  @Patch(':id/refund')
  markRefunded(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: { sub: number } }
  ) {
    return this.svc.markRefunded(id, req.user.sub)
  }
}
