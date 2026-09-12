import {
  BadRequestException,
  Injectable,
  NotFoundException
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import type { PaginatedResult } from '../common/dto/pagination.dto'
import { CreateReviewDto } from './dto/create-review.dto'
import type { ReviewStatus } from '../admin-reviews/dto/review.dto'

// Phase 3: 门槛 = 仅 status===3（已完成）的订单可以评价
const REVIEWABLE_ORDER_STATUS = 3

@Injectable()
export class ClientReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 校验链:
   * 1. orderId 属于当前 user
   * 2. order.status === REVIEWABLE_ORDER_STATUS
   * 3. order.items 中含 productId
   * 4. (DB 唯一约束兜底) 不存在同 orderId + productId 的 review
   */
  private async assertCanReview(userId: number, dto: CreateReviewDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { items: { select: { productId: true } } }
    })
    if (!order || order.userId !== userId) {
      throw new NotFoundException('订单不存在')
    }
    if (order.status !== REVIEWABLE_ORDER_STATUS) {
      throw new BadRequestException(
        `仅「已完成」订单可以评价，当前状态 ${order.status}`
      )
    }
    const item = order.items.find((i) => i.productId === dto.productId)
    if (!item) {
      throw new BadRequestException('该订单未包含此商品')
    }
  }

  async create(userId: number, dto: CreateReviewDto) {
    await this.assertCanReview(userId, dto)
    try {
      return await this.prisma.review.create({
        data: {
          userId,
          productId: dto.productId,
          orderId: dto.orderId,
          rating: dto.rating,
          content: dto.content,
          images: dto.images ?? [],
          status: 0
        }
      })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException('该订单商品已评价过')
      }
      throw e
    }
  }

  async listMy(
    userId: number,
    q: { status?: ReviewStatus; page?: number; pageSize?: number }
  ): Promise<PaginatedResult<unknown>> {
    const page = q.page ?? 1
    const pageSize = q.pageSize ?? 10
    const where: Prisma.ReviewWhereInput = { userId }
    if (q.status !== undefined) where.status = q.status

    const [total, list] = await this.prisma.$transaction([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where,
        orderBy: [{ id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          product: { select: { id: true, title: true, cover: true } }
        }
      })
    ])

    return {
      list: list.map((r) => ({ ...r, images: r.images ?? [] })),
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total
    }
  }

  /**
   * 公开接口：按商品分页查询已通过评价（status=1）+ 平均分聚合。
   * 商品详情页底部展示区使用。
   */
  async listByProduct(
    productId: number,
    page: number,
    pageSize: number
  ): Promise<{
    summary: { average: number; total: number }
    list: unknown[]
    page: number
    pageSize: number
    hasMore: boolean
  }> {
    const where: Prisma.ReviewWhereInput = { productId, status: 1 }

    const [agg, total, list] = await this.prisma.$transaction([
      this.prisma.review.aggregate({
        where,
        _avg: { rating: true },
        _count: { _all: true }
      }),
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where,
        orderBy: [{ id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { id: true, username: true, nickname: true } }
        }
      })
    ])

    return {
      summary: {
        average: agg._avg.rating ? Number(agg._avg.rating.toFixed(2)) : 0,
        total: agg._count._all
      },
      list: list.map((r) => ({ ...r, images: r.images ?? [] })),
      page,
      pageSize,
      hasMore: page * pageSize < total
    }
  }

  /**
   * 订单内「商品 x 是否可评价」便捷接口。
   * OrderDetailView 渲染「评价」按钮前调用。
   */
  async getCanReview(userId: number, orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { select: { productId: true } } }
    })
    if (!order || order.userId !== userId) {
      throw new NotFoundException('订单不存在')
    }

    const reviewed = await this.prisma.review.findMany({
      where: { orderId, userId },
      select: { productId: true }
    })
    const reviewedSet = new Set(reviewed.map((r) => r.productId))

    return {
      orderStatus: order.status,
      items: order.items.map((it) => ({
        productId: it.productId,
        canReview:
          order.status === REVIEWABLE_ORDER_STATUS && !reviewedSet.has(it.productId)
      }))
    }
  }
}
