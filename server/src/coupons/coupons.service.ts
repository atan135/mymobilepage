import {
  BadRequestException,
  Injectable,
  NotFoundException
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import type { PaginatedResult } from '../common/dto/pagination.dto'
import type {
  PreviewCouponDto,
  QueryMyCouponDto
} from './dto/coupon.dto'

export interface CouponWithAvailability {
  id: number
  name: string
  type: number
  threshold: number | null
  amount: number
  description: string | null
  validFrom: string
  validTo: string
  total: number
  perUserLimit: number
  status: number
  claimed: number
  remaining: number
  received: boolean
}

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  async listAvailable(userId: number): Promise<CouponWithAvailability[]> {
    const now = new Date()
    const coupons = await this.prisma.coupon.findMany({
      where: {
        status: 1,
        validFrom: { lte: now },
        validTo: { gte: now }
      },
      orderBy: [{ id: 'desc' }]
    })
    if (coupons.length === 0) return []

    const couponIds = coupons.map((c) => c.id)

    const [claimGroups, userClaims] = await this.prisma.$transaction([
      this.prisma.userCoupon.groupBy({
        by: ['couponId'],
        orderBy: { couponId: 'asc' },
        where: { couponId: { in: couponIds } },
        _count: true
      }),
      this.prisma.userCoupon.groupBy({
        by: ['couponId'],
        orderBy: { couponId: 'asc' },
        where: { userId, couponId: { in: couponIds } },
        _count: true
      })
    ])

    const claimedMap = new Map<number, number>()
    for (const g of claimGroups) {
      const n = typeof g._count === 'number' ? g._count : 0
      claimedMap.set(g.couponId, n)
    }
    const userClaimMap = new Map<number, number>()
    for (const g of userClaims) {
      const n = typeof g._count === 'number' ? g._count : 0
      userClaimMap.set(g.couponId, n)
    }

    return coupons
      .map((c) => {
        const claimed = claimedMap.get(c.id) ?? 0
        const userClaimed = userClaimMap.get(c.id) ?? 0
        const remaining = Math.max(0, c.total - claimed)
        return {
          id: c.id,
          name: c.name,
          type: c.type,
          threshold: c.threshold !== null ? Number(c.threshold) : null,
          amount: Number(c.amount),
          description: c.description,
          validFrom: c.validFrom.toISOString(),
          validTo: c.validTo.toISOString(),
          total: c.total,
          perUserLimit: c.perUserLimit,
          status: c.status,
          claimed,
          remaining,
          received: userClaimed >= c.perUserLimit
        }
      })
      .filter((c) => c.remaining > 0)
  }

  async claim(userId: number, couponId: number) {
    /**
     * 并发安全领取：
     * - 整个流程包在 $transaction 中；
     * - 第一步用 SELECT ... FOR UPDATE 锁住 coupon 行，使同一 coupon 的并发
     *   claim 串行化；
     * - 在事务内重新校验 perUserLimit / totalClaimed，避免 count-then-create
     *   竞态导致的超发。
     */
    const userCoupon = await this.prisma.$transaction(async (tx) => {
      const lockRows = await tx.$queryRaw<Array<{ id: number }>>(
        Prisma.sql`SELECT id FROM "Coupon" WHERE id = ${couponId} FOR UPDATE`
      )
      if (lockRows.length === 0) {
        throw new NotFoundException('优惠券不存在')
      }

      const coupon = await tx.coupon.findUnique({ where: { id: couponId } })
      if (!coupon) throw new NotFoundException('优惠券不存在')
      if (coupon.status !== 1) throw new BadRequestException('该优惠券已停用')

      const now = new Date()
      if (coupon.validFrom > now) throw new BadRequestException('该优惠券尚未开始发放')
      if (coupon.validTo < now) throw new BadRequestException('该优惠券已过期')

      const userClaimed = await tx.userCoupon.count({
        where: { userId, couponId }
      })
      if (userClaimed >= coupon.perUserLimit) {
        throw new BadRequestException(`每人限领 ${coupon.perUserLimit} 张`)
      }

      const totalClaimed = await tx.userCoupon.count({ where: { couponId } })
      if (totalClaimed >= coupon.total) {
        throw new BadRequestException('该优惠券已被领完')
      }

      return tx.userCoupon.create({
        data: {
          userId,
          couponId,
          status: 0,
          source: 0,
          expiresAt: coupon.validTo
        },
        include: { coupon: true }
      })
    })

    return this.formatUserCoupon(userCoupon)
  }

  async listMine(
    userId: number,
    q: QueryMyCouponDto
  ): Promise<PaginatedResult<unknown>> {
    const page = q.page ?? 1
    const pageSize = q.pageSize ?? 10
    const now = new Date()
    const where: Prisma.UserCouponWhereInput = { userId }

    if (q.status === 0) {
      where.status = 0
      where.OR = [{ expiresAt: null }, { expiresAt: { gte: now } }]
    } else if (q.status === 1) {
      where.status = 1
    } else if (q.status === 2) {
      where.status = 0
      where.expiresAt = { lt: now }
    }

    const [total, list] = await this.prisma.$transaction([
      this.prisma.userCoupon.count({ where }),
      this.prisma.userCoupon.findMany({
        where,
        orderBy: [{ id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { coupon: true }
      })
    ])

    return {
      list: list.map((uc) => this.formatUserCoupon(uc)),
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total
    }
  }

  async preview(userId: number, dto: PreviewCouponDto) {
    const productIds = dto.items.map((i) => i.productId)
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } }
    })
    if (products.length !== productIds.length) {
      throw new BadRequestException('部分商品不存在')
    }

    const originalAmount = Number(
      dto.items
        .reduce((s, it) => {
          const p = products.find((x) => x.id === it.productId)!
          return s + Number(p.price) * it.quantity
        }, 0)
        .toFixed(2)
    )

    if (dto.couponId === undefined) {
      return {
        originalAmount,
        discountAmount: 0,
        totalAmount: originalAmount,
        coupon: null
      }
    }

    const userCoupon = await this.prisma.userCoupon.findUnique({
      where: { id: dto.couponId },
      include: { coupon: true }
    })
    if (!userCoupon || userCoupon.userId !== userId) {
      throw new BadRequestException('优惠券不可用')
    }
    if (userCoupon.status !== 0) {
      throw new BadRequestException('优惠券已使用')
    }
    if (userCoupon.expiresAt && userCoupon.expiresAt < new Date()) {
      throw new BadRequestException('优惠券已过期')
    }

    const coupon = userCoupon.coupon
    const discount = this.calculateDiscount(coupon, originalAmount)
    return {
      originalAmount,
      discountAmount: discount,
      totalAmount: Number(Math.max(0, originalAmount - discount).toFixed(2)),
      coupon: {
        id: coupon.id,
        name: coupon.name,
        type: coupon.type,
        threshold: coupon.threshold !== null ? Number(coupon.threshold) : null,
        amount: Number(coupon.amount)
      }
    }
  }

  /**
   * 事务外版本（预览 / 试算）：校验 + 计算折扣金额。
   * 失败抛 BadRequestException。
   *
   * 安全说明：此方法只用于纯展示。如果要在订单创建事务中真正消费 UserCoupon，
   * 必须调用 resolveDiscountInTx，把校验与后续 update 放到同一个交互式事务内，
   * 否则会出现"同一张券被两个订单同时使用"或"已停用优惠券仍可下单"。
   */
  async resolveDiscount(
    userId: number,
    couponId: number,
    originalAmount: number
  ): Promise<{ userCouponId: number; discountAmount: number }> {
    return this.resolveDiscountInTx(this.prisma, userId, couponId, originalAmount)
  }

  /**
   * 事务内版本：接受 Prisma.TransactionClient，将校验与调用方的后续 update
   * 放到同一个 $transaction 中，避免并发消费同一张 UserCoupon。
   *
   * 注意：调用方仍需对 UserCoupon 做条件 update where: { id, status: 0 }，
   * 并在 matched === 0 时抛 BadRequestException，形成闭环防护。
   */
  async resolveDiscountInTx(
    tx: Prisma.TransactionClient,
    userId: number,
    couponId: number,
    originalAmount: number
  ): Promise<{ userCouponId: number; discountAmount: number }> {
    const userCoupon = await tx.userCoupon.findUnique({
      where: { id: couponId },
      include: { coupon: true }
    })
    if (!userCoupon || userCoupon.userId !== userId) {
      throw new BadRequestException('优惠券不可用')
    }
    if (userCoupon.status !== 0) {
      throw new BadRequestException('优惠券已使用')
    }
    if (userCoupon.expiresAt && userCoupon.expiresAt < new Date()) {
      throw new BadRequestException('优惠券已过期')
    }

    const discountAmount = this.calculateDiscount(userCoupon.coupon, originalAmount)
    return {
      userCouponId: userCoupon.id,
      discountAmount
    }
  }

  /**
   * type=1 满减 / 2 折扣（amount 为百分比 85.5 = 8.55 折） / 3 无门槛
   * 返回折扣金额（不超过 originalAmount，四舍五入到分）。
   */
  calculateDiscount(
    coupon: {
      id: number
      type: number
      threshold: Prisma.Decimal | null
      amount: Prisma.Decimal
    },
    originalAmount: number
  ): number {
    const threshold = coupon.threshold !== null ? Number(coupon.threshold) : 0
    const amount = Number(coupon.amount)
    let discount = 0

    if (coupon.type === 1) {
      if (originalAmount < threshold) {
        throw new BadRequestException(
          `订单金额不满足优惠券门槛（需 ¥${threshold.toFixed(2)}）`
        )
      }
      discount = amount
    } else if (coupon.type === 2) {
      if (originalAmount < threshold) {
        throw new BadRequestException(
          `订单金额不满足优惠券门槛（需 ¥${threshold.toFixed(2)}）`
        )
      }
      discount = originalAmount * (amount / 100)
      discount = Math.round(discount * 100) / 100
    } else if (coupon.type === 3) {
      discount = amount
    } else {
      throw new BadRequestException('未知的优惠券类型')
    }

    discount = Math.min(discount, originalAmount)
    return Math.round(discount * 100) / 100
  }

  private formatUserCoupon(uc: {
    id: number
    userId: number
    couponId: number
    status: number
    source: number
    receivedAt: Date
    usedAt: Date | null
    expiresAt: Date | null
    orderId: number | null
    coupon: {
      id: number
      name: string
      type: number
      threshold: Prisma.Decimal | null
      amount: Prisma.Decimal
      description: string | null
      validFrom: Date
      validTo: Date
      total: number
      perUserLimit: number
      status: number
    }
  }) {
    const now = new Date()
    const coupon = uc.coupon
    let displayStatus: number = uc.status
    if (uc.status === 0 && uc.expiresAt && uc.expiresAt < now) {
      displayStatus = 2
    }
    return {
      id: uc.id,
      couponId: uc.couponId,
      status: displayStatus,
      source: uc.source,
      receivedAt: uc.receivedAt.toISOString(),
      usedAt: uc.usedAt !== null ? uc.usedAt.toISOString() : null,
      expiresAt: uc.expiresAt !== null ? uc.expiresAt.toISOString() : null,
      orderId: uc.orderId,
      coupon: {
        id: coupon.id,
        name: coupon.name,
        type: coupon.type,
        threshold: coupon.threshold !== null ? Number(coupon.threshold) : null,
        amount: Number(coupon.amount),
        description: coupon.description,
        validFrom: coupon.validFrom.toISOString(),
        validTo: coupon.validTo.toISOString()
      }
    }
  }
}
