import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto'

@Injectable()
export class AdminCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.category.findMany({
      orderBy: [{ sort: 'asc' }, { id: 'asc' }],
      include: { _count: { select: { products: true } } }
    })
  }

  async findOne(id: number) {
    const c = await this.prisma.category.findUnique({ where: { id } })
    if (!c) throw new NotFoundException('分类不存在')
    return c
  }

  async create(dto: CreateCategoryDto) {
    const dup = await this.prisma.category.findFirst({ where: { name: dto.name } })
    if (dup) throw new ConflictException('分类名称已存在')
    return this.prisma.category.create({ data: dto })
  }

  async update(id: number, dto: UpdateCategoryDto) {
    await this.findOne(id)
    if (dto.name) {
      const dup = await this.prisma.category.findFirst({
        where: { name: dto.name, NOT: { id } }
      })
      if (dup) throw new ConflictException('分类名称已存在')
    }
    return this.prisma.category.update({ where: { id }, data: dto })
  }

  async remove(id: number) {
    const c = await this.findOne(id)
    const count = await this.prisma.product.count({ where: { categoryId: id } })
    if (count > 0) {
      throw new ConflictException(`分类下还有 ${count} 个商品，无法删除`)
    }
    return this.prisma.category.delete({ where: { id: c.id } })
  }
}