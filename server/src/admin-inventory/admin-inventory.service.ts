import { Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import type { PaginatedResult } from '../common/dto/pagination.dto'
import type {
  QueryInventoryLogDto,
  UpdateProductThresholdDto
} from './dto/inventory.dto'

@Injectable()
export class AdminInventoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 流水查询。
   * keyword 命中 product.title（mode=insensitive）。
   */
  async listLogs(
    q: QueryInventoryLogDto
  ): Promise<PaginatedResult<unknown>> {
    const page = q.page ?? 1
    const pageSize = q.pageSize ?? 20
    const where: Prisma.InventoryLogWhereInput = {}
    if (q.productId !== undefined) where.productId = q.productId
    if (q.type !== undefined) where.type = q.type
    if (q.keyword) {
      where.product = { title: { contains: q.keyword, mode: 'insensitive' } }
    }

    const [total, list] = await this.prisma.$transaction([
      this.prisma.inventoryLog.count({ where }),
      this.prisma.inventoryLog.findMany({
        where,
        orderBy: [{ id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          product: { select: { id: true, title: true, cover: true } },
          operator: {
            select: { id: true, username: true, nickname: true }
          }
        }
      })
    ])

    return {
      list,
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total
    }
  }

  /**
   * 预警商品列表：stock <= threshold AND status = 1（上架）。
   * 默认按 (threshold - stock) desc 排序，最缺货的排前。
   */
  async warnings() {
    const rows = await this.prisma.product.findMany({
      where: { status: 1 },
      orderBy: [{ id: 'desc' }]
    })
    return rows
      .filter((p) => p.stock <= p.threshold)
      .map((p) => ({
        id: p.id,
        title: p.title,
        cover: p.cover,
        stock: p.stock,
        threshold: p.threshold,
        gap: p.threshold - p.stock,
        status: p.status,
        categoryId: p.categoryId
      }))
      .sort((a, b) => b.gap - a.gap)
  }

  /**
   * 设置单商品库存预警阈值。
   */
  async setThreshold(productId: number, dto: UpdateProductThresholdDto) {
    const exists = await this.prisma.product.findUnique({
      where: { id: productId }
    })
    if (!exists) throw new NotFoundException('商品不存在')
    return this.prisma.product.update({
      where: { id: productId },
      data: { threshold: dto.threshold }
    })
  }

  /**
   * 预警汇总数（Dashboard 用）。
   */
  async warningCount(): Promise<number> {
    const rows = await this.prisma.product.findMany({
      where: { status: 1 },
      select: { stock: true, threshold: true }
    })
    return rows.filter((p) => p.stock <= p.threshold).length
  }
}
