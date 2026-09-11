import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { InventoryService, type InventoryType } from '../inventory/inventory.service'
import {
  CreateProductDto,
  UpdateProductDto,
  QueryProductDto,
  UpdateProductStockDto
} from './dto/product.dto'
import type { PaginatedResult } from '../common/dto/pagination.dto'

@Injectable()
export class AdminProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService
  ) {}

  async list(q: QueryProductDto): Promise<PaginatedResult<unknown>> {
    const page = q.page ?? 1
    const pageSize = q.pageSize ?? 10
    const where: Record<string, unknown> = {}
    if (q.categoryId) where.categoryId = q.categoryId
    if (q.status !== undefined) where.status = q.status
    if (q.minPrice !== undefined || q.maxPrice !== undefined) {
      where.price = {
        ...(q.minPrice !== undefined ? { gte: q.minPrice } : {}),
        ...(q.maxPrice !== undefined ? { lte: q.maxPrice } : {})
      }
    }
    if (q.keyword) {
      where.title = { contains: q.keyword, mode: 'insensitive' }
    }

    const [total, list] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy: [{ id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { category: { select: { id: true, name: true } } }
      })
    ])

    return {
      list: list.map((p) => ({
        ...p,
        price: Number(p.price),
        originalPrice: p.originalPrice ? Number(p.originalPrice) : null
      })),
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total
    }
  }

  async findOne(id: number) {
    const p = await this.prisma.product.findUnique({
      where: { id },
      include: { category: { select: { id: true, name: true } } }
    })
    if (!p) throw new NotFoundException('商品不存在')
    return { ...p, price: Number(p.price), originalPrice: p.originalPrice ? Number(p.originalPrice) : null }
  }

  async create(dto: CreateProductDto) {
    const cat = await this.prisma.category.findUnique({ where: { id: dto.categoryId } })
    if (!cat) throw new BadRequestException('分类不存在')
    return this.prisma.product.create({
      data: {
        title: dto.title,
        price: dto.price,
        originalPrice: dto.originalPrice,
        cover: dto.cover,
        images: dto.images ?? [],
        description: dto.description,
        stock: dto.stock ?? 0,
        status: dto.status ?? 1,
        categoryId: dto.categoryId
      }
    })
  }

  async update(id: number, dto: UpdateProductDto) {
    await this.findOne(id)
    if (dto.categoryId) {
      const cat = await this.prisma.category.findUnique({ where: { id: dto.categoryId } })
      if (!cat) throw new BadRequestException('分类不存在')
    }
    return this.prisma.product.update({ where: { id }, data: dto })
  }

  async setStatus(id: number, status: number) {
    await this.findOne(id)
    return this.prisma.product.update({ where: { id }, data: { status } })
  }

  async adjustStock(id: number, dto: UpdateProductStockDto, operatorId: number) {
    const before = await this.findOne(id)
    const beforeStock = before.stock
    const afterStock = dto.stock
    if (afterStock === beforeStock) {
      return before
    }
    const diff = afterStock - beforeStock
    const type: InventoryType = 3 // ADJUST
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({ where: { id }, data: { stock: afterStock } })
      await this.inventory.recordChange(tx, {
        productId: id,
        type,
        quantity: diff,
        beforeStock,
        afterStock,
        reason: '后台调整库存',
        operatorId
      })
      return updated
    })
  }

  async remove(id: number) {
    await this.findOne(id)
    return this.prisma.product.delete({ where: { id } })
  }
}