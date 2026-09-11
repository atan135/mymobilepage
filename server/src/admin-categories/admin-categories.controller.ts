import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards
} from '@nestjs/common'
import { RequirePermission } from '../admin-auth/decorators/require-permission.decorator'
import { AdminCategoriesService } from './admin-categories.service'
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto'

@Controller('admin/categories')
export class AdminCategoriesController {
  constructor(private readonly svc: AdminCategoriesService) {}

  @RequirePermission('category:list')
  @Get()
  list() {
    return this.svc.list()
  }

  @RequirePermission('category:list')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.svc.findOne(id)
  }

  @RequirePermission('category:create')
  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.svc.create(dto)
  }

  @RequirePermission('category:edit')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto
  ) {
    return this.svc.update(id, dto)
  }

  @RequirePermission('category:delete')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id)
  }
}