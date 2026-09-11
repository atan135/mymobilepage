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
    const coupon = await this.prisma.coupon.findUnique({ where: { id: couponId } })
    if (!coupon) throw new NotFoundException('优惠券不存在')
    if (coupon.status !== 1) throw new BadRequestException('该优惠券已停用')

    const now = new Date()
    if (coupon.validFrom > now) throw new BadRequestException('该优惠券尚未开始发放')
    if (coupon.validTo < now) throw new BadRequestException('该优惠券已过期')

    const userClaimed = await this.prisma.userCoupon.count({
      where: { userId, couponId }
    })
    if (userClaimed >= coupon.perUserLimit) {
      throw new BadRequestException(`每人限领 ${coupon.perUserLimit} 张`)
    }

    const totalClaimed = await this.prisma.userCoupon.count({ where: { couponId } })
    if (totalClaimed >= coupon.total) {
      throw new BadRequestException('该优惠券已被领完')
    }

    const userCoupon = await this.prisma.userCoupon.create({
      data: {
        userId,
        couponId,
        status: 0,
        source: 0,
        expiresAt: coupon.validTo
      },
      include: { coupon: true }
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
   * 订单创建时复用：校验 + 计算折扣金额。
   * 失败抛 BadRequestException（与 preview 共用同一种语义）。
   */
  async resolveDiscount(
    userId: number,
    couponId: number,
    originalAmount: number
  ): Promise<{ userCouponId: number; discountAmount: number }> {
    const userCoupon = await this.prisma.userCoupon.findUnique({
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
