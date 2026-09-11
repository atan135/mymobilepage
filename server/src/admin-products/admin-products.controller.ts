import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards
} from '@nestjs/common'
import type { Request } from 'express'
import { RequirePermission } from '../admin-auth/decorators/require-permission.decorator'
import { AdminProductsService } from './admin-products.service'
import {
  CreateProductDto,
  UpdateProductDto,
  QueryProductDto,
  UpdateProductStatusDto,
  UpdateProductStockDto
} from './dto/product.dto'

@Controller('admin/products')
export class AdminProductsController {
  constructor(private readonly svc: AdminProductsService) {}

  @RequirePermission('product:list')
  @Get()
  list(@Query() q: QueryProductDto) {
    return this.svc.list(q)
  }

  @RequirePermission('product:list')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findOne(id)
  }

  @RequirePermission('product:create')
  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.svc.create(dto)
  }

  @RequirePermission('product:edit')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto
  ) {
    return this.svc.update(id, dto)
  }

  @RequirePermission('product:on_off')
  @Patch(':id/status')
  setStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductStatusDto
  ) {
    return this.svc.setStatus(id, dto.status)
  }

  @RequirePermission('product:adjust_stock')
  @Patch(':id/stock')
  adjustStock(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductStockDto,
    @Req() req: Request & { user: { sub: number } }
  ) {
    return this.svc.adjustStock(id, dto, req.user.sub)
  }

  @RequirePermission('product:delete')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id)
  }
}