import {
  BadRequestException,
  Injectable,
  NotFoundException
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { InventoryService } from '../inventory/inventory.service'
import { PrismaService } from '../prisma/prisma.service'
import type { PaginatedResult } from '../common/dto/pagination.dto'
import {
  QueryRefundDto,
  REFUND_TRANSITIONS,
  RejectRefundDto,
  type RefundStatus
} from './dto/refund.dto'

@Injectable()
export class AdminRefundsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService
  ) {}

  async list(q: QueryRefundDto): Promise<PaginatedResult<unknown>> {
    const page = q.page ?? 1
    const pageSize = q.pageSize ?? 10
    const where: Prisma.RefundRequestWhereInput = {}
    if (q.status !== undefined) where.status = q.status
    if (q.keyword) {
      if (/^\d+$/.test(q.keyword)) {
        // 全数字：匹配 RefundRequest.id 或 orderId
        const n = Number(q.keyword)
        where.OR = [{ id: n }, { orderId: n }]
      } else {
        where.order = {
          user: { username: { contains: q.keyword, mode: 'insensitive' } }
        }
      }
    }

    const [total, list] = await this.prisma.$transaction([
      this.prisma.refundRequest.count({ where }),
      this.prisma.refundRequest.findMany({
        where,
        orderBy: [{ id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          order: {
            select: {
              id: true,
              orderNo: true,
              totalAmount: true,
              status: true,
              user: {
                select: { id: true, username: true, nickname: true }
              }
            }
          }
        }
      })
    ])

    return {
      list: list.map((r) => ({
        ...r,
        amount: Number(r.amount),
        order: r.order
          ? { ...r.order, totalAmount: Number(r.order.totalAmount) }
          : null
      })),
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total
    }
  }

  async findOne(id: number) {
    const r = await this.prisma.refundRequest.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            user: {
              select: { id: true, username: true, nickname: true, phone: true }
            },
            items: true,
            coupons: { include: { coupon: true } }
          }
        }
      }
    })
    if (!r) throw new NotFoundException('退款申请不存在')
    return this.formatRefund(r)
  }

  async approve(id: number) {
    const r = await this.findOne(id)
    this.assertTransition(r.status, 1)
    return this.prisma.refundRequest.update({
      where: { id },
      data: { status: 1 }
    })
  }

  async reject(id: number, dto: RejectRefundDto) {
    const r = await this.findOne(id)
    this.assertTransition(r.status, 2)
    return this.prisma.refundRequest.update({
      where: { id },
      data: { status: 2, remark: dto.remark }
    })
  }

  /**
   * 标记已退款（演示版 mock）。
   * 事务内：
   *   1) 还原商品 stock + 减 sales
   *   2) 关联 UserCoupon 退回未使用 + 清空 orderId
   *   3) refund.status → 3
   */
  async markRefunded(id: number, operatorId: number) {
    const r = await this.findOne(id)
    this.assertTransition(r.status, 3)

    const order = await this.prisma.order.findUnique({
      where: { id: r.orderId },
      include: { items: true, coupons: true }
    })
    if (!order) throw new NotFoundException('关联订单不存在')

    await this.prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        const before = await tx.product.findUnique({
          where: { id: item.productId },
          select: { stock: true }
        })
        if (!before) continue
        const after = await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity },
            sales: { decrement: item.quantity }
          }
        })
        await this.inventory.recordChange(tx, {
          productId: item.productId,
          type: 4, // REFUND_IN
          quantity: item.quantity,
          beforeStock: before.stock,
          afterStock: after.stock,
          reason: `退款 #${id} 入库`,
          operatorId
        })
      }

      for (const uc of order.coupons) {
        await tx.userCoupon.update({
          where: { id: uc.id },
          data: {
            status: 0,
            usedAt: null,
            orderId: null
          }
        })
      }

      await tx.refundRequest.update({
        where: { id },
        data: { status: 3 }
      })
    })

    return this.findOne(id)
  }

  private assertTransition(from: number, to: RefundStatus) {
    const allowed = REFUND_TRANSITIONS[from as RefundStatus] ?? []
    if (!allowed.includes(to)) {
      throw new BadRequestException(
        `退款状态不允许从 ${from} 切换到 ${to}`
      )
    }
  }

  private formatRefund(r: {
    id: number
    orderId: number
    reason: string
    amount: Prisma.Decimal | number
    status: number
    remark: string | null
    createdAt: Date
    updatedAt: Date
    order: {
      id: number
      orderNo: string
      totalAmount: Prisma.Decimal | number
      status: number
      user?: { id: number; username: string; nickname: string | null; phone: string | null }
      items?: Array<{
        id: number
        productId: number
        productTitle: string
        productCover: string
        price: Prisma.Decimal | number
        quantity: number
      }>
      coupons?: Array<{
        id: number
        couponId: number
        status: number
        coupon: {
          id: number
          name: string
          type: number
          threshold: Prisma.Decimal | number | null
          amount: Prisma.Decimal | number
        } | null
      }>
    } | null
  }) {
    return {
      id: r.id,
      orderId: r.orderId,
      reason: r.reason,
      amount: Number(r.amount),
      status: r.status,
      remark: r.remark,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      order: r.order
        ? {
            id: r.order.id,
            orderNo: r.order.orderNo,
            totalAmount: Number(r.order.totalAmount),
            status: r.order.status,
            user: r.order.user ?? null,
            items: r.order.items?.map((it) => ({ ...it, price: Number(it.price) })) ?? [],
            coupon:
              r.order.coupons && r.order.coupons.length > 0
                ? (() => {
                    const uc = r.order.coupons![0]
                    const c = uc.coupon
                    return {
                      userCouponId: uc.id,
                      couponId: uc.couponId,
                      name: c?.name ?? '',
                      type: c?.type ?? 0,
                      amount: c ? Number(c.amount) : 0
                    }
                  })()
                : null
          }
        : null
    }
  }
}
