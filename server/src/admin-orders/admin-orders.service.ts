import {
  BadRequestException,
  Injectable,
  NotFoundException
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import type { PaginatedResult } from '../common/dto/pagination.dto'
import {
  ORDER_STATUSES,
  ORDER_TRANSITIONS,
  ShipOrderDto,
  UpdateOrderStatusDto,
  type QueryOrderDto
} from './dto/order.dto'

@Injectable()
export class AdminOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: QueryOrderDto): Promise<PaginatedResult<unknown>> {
    const page = q.page ?? 1
    const pageSize = q.pageSize ?? 10
    const where: Prisma.OrderWhereInput = {}
    if (q.status !== undefined) where.status = q.status
    if (q.keyword) {
      // 订单号精确匹配优先；否则按用户名模糊
      if (/^\d+$/.test(q.keyword)) {
        where.id = Number(q.keyword)
      } else {
        where.user = { username: { contains: q.keyword, mode: 'insensitive' } }
      }
    }

    const [total, list] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        orderBy: [{ id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { id: true, username: true, nickname: true } },
          items: { select: { id: true } }
        }
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

  async findOne(id: number) {
    const o = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, username: true, nickname: true, phone: true }
        },
        items: true,
        refund: true
      }
    })
    if (!o) throw new NotFoundException('订单不存在')

    const receiver = this.parseReceiver(o.receiver)
    return {
      ...o,
      totalAmount: Number(o.totalAmount),
      items: o.items.map((it) => ({
        ...it,
        price: Number(it.price)
      })),
      receiver
    }
  }

  /**
   * 通用状态机切换（不含发货：发货走 ship()）。
   * 不允许跨级跳：必须沿着 ORDER_TRANSITIONS 表走。
   */
  async updateStatus(id: number, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.order.findUnique({ where: { id } })
    if (!order) throw new NotFoundException('订单不存在')

    const from = order.status as 0 | 1 | 2 | 3 | 4
    const to = dto.status as 0 | 1 | 2 | 3 | 4
    const allowed = ORDER_TRANSITIONS[from] ?? []
    if (!allowed.includes(to)) {
      throw new BadRequestException(
        `订单状态不允许从 ${from} 切换到 ${to}`
      )
    }

    const data: Prisma.OrderUpdateInput = { status: to }
    const now = new Date()
    if (to === 1) data.paidAt = now
    if (to === 3) data.completedAt = now
    if (to === 4) data.cancelledAt = now

    return this.prisma.order.update({ where: { id }, data })
  }

  /**
   * 发货：PAID (1) → SHIPPED (2)，同时写入运单信息。
   * 若已是 SHIPPED，允许覆盖运单（便于客服改单）。
   */
  async ship(id: number, dto: ShipOrderDto) {
    const order = await this.prisma.order.findUnique({ where: { id } })
    if (!order) throw new NotFoundException('订单不存在')

    const from = order.status as 0 | 1 | 2 | 3 | 4
    if (from === 1) {
      return this.prisma.order.update({
        where: { id },
        data: {
          status: 2,
          shipCompany: dto.shipCompany,
          shipNo: dto.shipNo,
          shippedAt: new Date()
        }
      })
    }
    if (from === 2) {
      return this.prisma.order.update({
        where: { id },
        data: {
          shipCompany: dto.shipCompany,
          shipNo: dto.shipNo
        }
      })
    }
    throw new BadRequestException(`当前状态（${from}）不可发货`)
  }

  private parseReceiver(raw: Prisma.JsonValue): {
    name: string
    phone: string
    address: string
  } {
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
}

