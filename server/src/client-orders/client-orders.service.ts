import {
  BadRequestException,
  Injectable,
  NotFoundException
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import type { PaginatedResult } from '../common/dto/pagination.dto'
import {
  CreateOrderDto,
  QueryMyOrderDto,
  type ReceiverDto
} from './dto/order.dto'

@Injectable()
export class ClientOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建订单（购物车结算）：
   * 1. 校验商品存在 + 状态上架 + 库存充足
   * 2. 在事务中扣减 stock + 增加 sales
   * 3. 模拟支付成功 → 状态 PENDING→PAID，写 paidAt
   * 4. 返回订单详情
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
    const totalAmount = items.reduce(
      (s, it) => s + it.price * it.quantity,
      0
    )

    const orderNo = this.generateOrderNo()

    const order = await this.prisma.$transaction(async (tx) => {
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { decrement: item.quantity },
            sales: { increment: item.quantity }
          }
        })
      }

      const created = await tx.order.create({
        data: {
          orderNo,
          userId,
          totalAmount: new Prisma.Decimal(totalAmount.toFixed(2)),
          status: 1,
          receiver: dto.receiver as unknown as Prisma.JsonObject,
          remark: dto.remark,
          paidAt: new Date(),
          items: { create: items }
        },
        include: { items: true }
      })
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
      include: { items: true }
    })
    if (!o) throw new NotFoundException('订单不存在')
    if (o.userId !== userId) throw new NotFoundException('订单不存在')
    return this.formatOrder(o)
  }

  /**
   * 取消订单：PENDING 或 PAID → CANCELLED，事务回滚 stock + sales。
   */
  async cancel(userId: number, id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true }
    })
    if (!order || order.userId !== userId) {
      throw new NotFoundException('订单不存在')
    }
    const status = order.status as 0 | 1 | 2 | 3 | 4
    if (status !== 0 && status !== 1) {
      throw new BadRequestException(`当前状态（${status}）不可取消`)
    }

    await this.prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity },
            sales: { decrement: item.quantity }
          }
        })
      }
      await tx.order.update({
        where: { id },
        data: { status: 4, cancelledAt: new Date() }
      })
    })

    return this.findOne(userId, id)
  }

  /**
   * 确认收货：SHIPPED → COMPLETED。
   */
  async confirmReceipt(userId: number, id: number) {
    const order = await this.prisma.order.findUnique({ where: { id } })
    if (!order || order.userId !== userId) {
      throw new NotFoundException('订单不存在')
    }
    if (order.status !== 2) {
      throw new BadRequestException(`当前状态（${order.status}）不可确认收货`)
    }
    const updated = await this.prisma.order.update({
      where: { id },
      data: { status: 3, completedAt: new Date() },
      include: { items: true }
    })
    return this.formatOrder(updated)
  }

  private formatOrder(o: {
    id: number
    orderNo: string
    userId: number
    totalAmount: Prisma.Decimal | number
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
  }) {
    return {
      ...o,
      totalAmount: Number(o.totalAmount),
      receiver: this.parseReceiver(o.receiver),
      items: o.items?.map((it) => ({ ...it, price: Number(it.price) }))
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
