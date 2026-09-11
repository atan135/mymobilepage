import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query
} from '@nestjs/common'
import { RequirePermission } from '../admin-auth/decorators/require-permission.decorator'
import { AdminCouponsService } from './admin-coupons.service'
import {
  CreateCouponDto,
  GrantCouponDto,
  QueryClaimsDto,
  QueryCouponDto,
  UpdateCouponDto,
  UpdateCouponStatusDto
} from './dto/coupon.dto'

@Controller('admin/coupons')
export class AdminCouponsController {
  constructor(private readonly svc: AdminCouponsService) {}

  @RequirePermission('coupon:list')
  @Get()
  list(@Query() q: QueryCouponDto) {
    return this.svc.list(q)
  }

  @RequirePermission('coupon:list')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findOne(id)
  }

  @RequirePermission('coupon:create')
  @Post()
  create(@Body() dto: CreateCouponDto) {
    return this.svc.create(dto)
  }

  @RequirePermission('coupon:edit')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCouponDto
  ) {
    return this.svc.update(id, dto)
  }

  @RequirePermission('coupon:on_off')
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCouponStatusDto
  ) {
    return this.svc.updateStatus(id, dto)
  }

  @RequirePermission('coupon:delete')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id)
  }

  @RequirePermission('coupon:list')
  @Get(':id/claims')
  listClaims(
    @Param('id', ParseIntPipe) id: number,
    @Query() q: QueryClaimsDto
  ) {
    return this.svc.listClaims(id, q)
  }

  @RequirePermission('coupon:grant')
  @Post(':id/grant')
  grant(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: GrantCouponDto
  ) {
    return this.svc.grant(id, dto)
  }
}
