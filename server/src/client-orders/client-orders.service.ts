import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { CouponsService } from '../coupons/coupons.service'
import { InventoryService, type InventoryType } from '../inventory/inventory.service'
import type { PaginatedResult } from '../common/dto/pagination.dto'
import {
  CreateOrderDto,
  QueryMyOrderDto,
  type ReceiverDto
} from './dto/order.dto'

@Injectable()
export class ClientOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly couponsSvc: CouponsService,
    private readonly inventory: InventoryService
  ) {}

  /**
   * 创建订单（购物车结算）：
   * 1. 校验商品存在 + 状态上架 + 库存充足
   * 2. 若传 couponId，校验 + 试算折扣（复用 CouponsService.resolveDiscount）
   * 3. 在事务中扣减 stock + 增加 sales + 创建订单（含 originalAmount / discountAmount）
   * 4. 若使用优惠券：把 UserCoupon 标记为已使用，并绑定 orderId
   * 5. 模拟支付成功 → 状态 PENDING→PAID，写 paidAt
   * 6. 返回订单详情（含 coupon）
   */
  async create(userId: number, dto: CreateOrderDto) {
    const productIds = dto.items.map((i) => i.productId)
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } }
    })
    if (products.length !== productIds.length) {
      throw new BadRequestException('部分商品不存在')
    }

    for (const item of dto.items) {
      const p = products.find((x) => x.id === item.productId)!
      if (p.status !== 1) {
        throw new BadRequestException(`商品「${p.title}」已下架`)
      }
      if (p.stock < item.quantity) {
        throw new BadRequestException(
          `商品「${p.title}」库存不足（剩 ${p.stock}）`
        )
      }
    }

    const items = dto.items.map((item) => {
      const p = products.find((x) => x.id === item.productId)!
      return {
        productId: p.id,
        productTitle: p.title,
        productCover: p.cover,
        price: Number(p.price),
        quantity: item.quantity
      }
    })
    const originalAmount = Number(
      items.reduce((s, it) => s + it.price * it.quantity, 0).toFixed(2)
    )

    const orderNo = this.generateOrderNo()

    const order = await this.prisma.$transaction(async (tx) => {
      // 在事务内校验 + 锁定 UserCoupon，避免并发消费同一张券；
      // 事务外算的折扣金额只是 hint，真正落库以事务内计算为准。
      let discountAmount = 0
      let userCouponId: number | null = null
      if (dto.couponId !== undefined) {
        const r = await this.couponsSvc.resolveDiscountInTx(
          tx,
          userId,
          dto.couponId,
          originalAmount
        )
        discountAmount = r.discountAmount
        userCouponId = r.userCouponId
      }
      const totalAmount = Number(
        Math.max(0, originalAmount - discountAmount).toFixed(2)
      )

      for (const item of items) {
        // 单条 SQL UPDATE 原子完成 decrement, 用 update 的返回值 + delta 反推 beforeStock,
        // 避免 findUnique 与 update 之间被并发 update 插入导致 beforeStock 漂移。
        const after = await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { decrement: item.quantity },
            sales: { increment: item.quantity }
          },
          select: { stock: true }
        })
        if (after.stock < 0) {
          // 库存被并发单/并发减扣到 < 0, 回滚让调用方重试。
          throw new BadRequestException(`商品库存不足: ${item.productId}`)
        }
        const beforeStock = after.stock + item.quantity
        await this.inventory.recordChange(tx, {
          productId: item.productId,
          type: 2, // OUTBOUND
          quantity: -item.quantity,
          beforeStock,
          afterStock: after.stock,
          reason: `订单 ${orderNo} 出库`
        })
      }

      const created = await tx.order.create({
        data: {
          orderNo,
          userId,
          totalAmount: new Prisma.Decimal(totalAmount.toFixed(2)),
          originalAmount: new Prisma.Decimal(originalAmount.toFixed(2)),
          discountAmount: new Prisma.Decimal(discountAmount.toFixed(2)),
          status: 1,
          receiver: dto.receiver as unknown as Prisma.JsonObject,
          remark: dto.remark,
          paidAt: new Date(),
          items: { create: items }
        },
        include: { items: true, coupons: { include: { coupon: true } } }
      })

      if (userCouponId !== null) {
        // 条件 update where: { id, status: 0 }：
        // 若 status 已被另一并发事务改成 1（已使用），count === 0，
        // 必须抛 BadRequestException 整笔回滚，避免重复消费。
        const updated = await tx.userCoupon.updateMany({
          where: { id: userCouponId, status: 0 },
          data: {
            status: 1,
            usedAt: new Date(),
            orderId: created.id
          }
        })
        if (updated.count !== 1) {
          throw new BadRequestException('优惠券已被使用，请重新选择')
        }
      }

      return created
    })

    return this.formatOrder(order)
  }

  async listMy(userId: number, q: QueryMyOrderDto): Promise<PaginatedResult<unknown>> {
    const page = q.page ?? 1
    const pageSize = q.pageSize ?? 10
    const where: Prisma.OrderWhereInput = { userId }
    if (q.status !== undefined) where.status = q.status

    const [total, list] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        orderBy: [{ id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { items: { select: { id: true } } }
      })
    ])

    return {
      list: list.map((o) => ({
        ...o,
        totalAmount: Number(o.totalAmount),
        originalAmount: o.originalAmount !== null ? Number(o.originalAmount) : null,
        discountAmount: o.discountAmount !== null ? Number(o.discountAmount) : null,
        itemCount: o.items.length
      })),
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total
    }
  }

  async findOne(userId: number, id: number) {
    const o = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        coupons: { include: { coupon: true } },
        refund: true
      }
    })
    if (!o) throw new NotFoundException('订单不存在')
    if (o.userId !== userId) throw new NotFoundException('订单不存在')
    return this.formatOrder(o)
  }

  /**
   * 取消订单：PENDING 或 PAID → CANCELLED。
   * 事务内：回滚 stock + sales；若订单使用过优惠券，把 UserCoupon 退回到未使用。
   */
  async cancel(userId: number, id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        coupons: true,
        refund: true
      }
    })
    if (!order || order.userId !== userId) {
      throw new NotFoundException('订单不存在')
    }
    const status = order.status as 0 | 1 | 2 | 3 | 4
    if (status !== 0 && status !== 1) {
      throw new BadRequestException(`当前状态（${status}）不可取消`)
    }

    await this.prisma.$transaction(async (tx) => {
      // 条件 update：仅当 status 仍为 0/1 才允许转为 4，count !== 1 说明已被并发请求处理。
      const updated = await tx.order.updateMany({
        where: { id, userId, status: { in: [0, 1] } },
        data: { status: 4, cancelledAt: new Date() }
      })
      if (updated.count !== 1) {
        throw new ConflictException('订单状态已变更，请刷新后重试')
      }

      for (const item of order.items) {
        // 单条 SQL UPDATE 原子完成 increment, 用返回值反推 beforeStock。
        const after = await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity },
            sales: { decrement: item.quantity }
          },
          select: { stock: true }
        }).catch(() => null)
        if (!after) continue
        const beforeStock = after.stock - item.quantity
        await this.inventory.recordChange(tx, {
          productId: item.productId,
          type: 5, // CANCEL_IN
          quantity: item.quantity,
          beforeStock,
          afterStock: after.stock,
          reason: `订单 ${order.orderNo} 取消退库`
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
    })

    return this.findOne(userId, id)
  }

  /**
   * 确认收货：SHIPPED → COMPLETED。
   * 已发货后退款/退券不在本服务范围内（Phase 2 退款模块处理）。
   */
  async confirmReceipt(userId: number, id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true, coupons: { include: { coupon: true } }, refund: true }
    })
    if (!order || order.userId !== userId) {
      throw new NotFoundException('订单不存在')
    }
    if (order.status !== 2) {
      throw new BadRequestException(`当前状态（${order.status}）不可确认收货`)
    }
    const updated = await this.prisma.order.update({
      where: { id },
      data: { status: 3, completedAt: new Date() },
      include: { items: true, coupons: { include: { coupon: true } }, refund: true }
    })
    return this.formatOrder(updated)
  }

  private formatOrder(o: {
    id: number
    orderNo: string
    userId: number
    totalAmount: Prisma.Decimal | number
    originalAmount: Prisma.Decimal | number | null
    discountAmount: Prisma.Decimal | number | null
    status: number
    receiver: Prisma.JsonValue
    remark: string | null
    paidAt: Date | null
    shippedAt: Date | null
    completedAt: Date | null
    cancelledAt: Date | null
    shipCompany: string | null
    shipNo: string | null
    createdAt: Date
    updatedAt: Date
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
        description: string | null
      }
    }>
  }) {
    const usedCoupon = o.coupons?.[0]
      ? {
          userCouponId: o.coupons[0].id,
          couponId: o.coupons[0].couponId,
          name: o.coupons[0].coupon.name,
          type: o.coupons[0].coupon.type,
          amount: Number(o.coupons[0].coupon.amount)
        }
      : null

    return {
      ...o,
      totalAmount: Number(o.totalAmount),
      originalAmount:
        o.originalAmount !== null && o.originalAmount !== undefined
          ? Number(o.originalAmount)
          : null,
      discountAmount:
        o.discountAmount !== null && o.discountAmount !== undefined
          ? Number(o.discountAmount)
          : null,
      receiver: this.parseReceiver(o.receiver),
      items: o.items?.map((it) => ({ ...it, price: Number(it.price) })),
      coupon: usedCoupon
    }
  }

  private parseReceiver(raw: Prisma.JsonValue): ReceiverDto {
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const r = raw as Record<string, unknown>
      return {
        name: typeof r.name === 'string' ? r.name : '',
        phone: typeof r.phone === 'string' ? r.phone : '',
        address: typeof r.address === 'string' ? r.address : ''
      }
    }
    return { name: '', phone: '', address: '' }
  }

  private generateOrderNo(): string {
    const ts = Date.now().toString(36).toUpperCase()
    const rand = Math.floor(Math.random() * 0xffff)
      .toString(36)
      .toUpperCase()
      .padStart(4, '0')
    return `${ts}${rand}`
  }
}
