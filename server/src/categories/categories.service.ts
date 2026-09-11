import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto'

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.category.findMany({ orderBy: [{ sort: 'asc' }, { id: 'asc' }] })
  }

  async findOne(id: number) {
    const c = await this.prisma.category.findUnique({ where: { id } })
    if (!c) throw new NotFoundException('分类不存在')
    return c
  }

  create(dto: CreateCategoryDto) {
    return this.prisma.category.create({ data: dto })
  }

  async update(id: number, dto: UpdateCategoryDto) {
    await this.findOne(id)
    return this.prisma.category.update({ where: { id }, data: dto })
  }

  async remove(id: number) {
    await this.findOne(id)
    return this.prisma.category.delete({ where: { id } })
  }
}