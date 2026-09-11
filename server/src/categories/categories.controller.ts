import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common'
import { CategoriesService } from './categories.service'
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto'

@Controller('categories')
export class CategoriesController {
  constructor(private readonly svc: CategoriesService) {}

  @Get()
  list() {
    return this.svc.list()
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findOne(id)
  }

  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.svc.create(dto)
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto
  ) {
    return this.svc.update(id, dto)
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id)
  }
}