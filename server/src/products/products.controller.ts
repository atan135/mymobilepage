import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common'
import { ProductsService } from './products.service'
import { CreateProductDto, UpdateProductDto, QueryProductDto } from './dto/product.dto'

@Controller('products')
export class ProductsController {
  constructor(private readonly svc: ProductsService) {}

  @Get()
  list(@Query() query: QueryProductDto) {
    return this.svc.list(query)
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findOne(id)
  }

  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.svc.create(dto)
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto
  ) {
    return this.svc.update(id, dto)
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id)
  }
}