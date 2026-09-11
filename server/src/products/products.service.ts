import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateProductDto, UpdateProductDto, QueryProductDto } from './dto/product.dto'

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: QueryProductDto) {
    const page = q.page ?? 1
    const pageSize = q.pageSize ?? 10
    const where = q.categoryId ? { categoryId: q.categoryId } : undefined

    const [total, list] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy: [{ id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ])

    return {
      list: list.map((p) => ({ ...p, price: Number(p.price), originalPrice: p.originalPrice ? Number(p.originalPrice) : undefined })),
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total
    }
  }

  async findOne(id: number) {
    const p = await this.prisma.product.findUnique({ where: { id } })
    if (!p) throw new NotFoundException('商品不存在')
    return { ...p, price: Number(p.price), originalPrice: p.originalPrice ? Number(p.originalPrice) : undefined }
  }

  create(dto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        title: dto.title,
        price: dto.price,
        originalPrice: dto.originalPrice,
        cover: dto.cover,
        images: dto.images ?? [],
        description: dto.description,
        stock: dto.stock ?? 0,
        categoryId: dto.categoryId
      }
    })
  }

  async update(id: number, dto: UpdateProductDto) {
    await this.findOne(id)
    return this.prisma.product.update({ where: { id }, data: dto })
  }

  async remove(id: number) {
    await this.findOne(id)
    return this.prisma.product.delete({ where: { id } })
  }
}