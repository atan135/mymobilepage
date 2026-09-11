import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

export interface DashboardOverview {
  todayOrders: number
  todayGmv: number
  totalUsers: number
  pendingOrders: number
  topProducts: Array<{
    productId: number
    title: string
    cover: string
    sales: number
    gmv: number
  }>
  pendingOrderList: Array<{
    id: number
    orderNo: string
    totalAmount: number
    createdAt: Date
    user: { username: string; nickname: string | null }
  }>
}

export interface SalesTrendPoint {
  date: string
  amount: number
  count: number
}

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(): Promise<DashboardOverview> {
    const startOfToday = this.startOfDay(new Date())

    const [todayOrderCount, todayGmvAgg, totalUsers, pendingOrders, topRows] =
      await this.prisma.$transaction([
        this.prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
        this.prisma.order.aggregate({
          _sum: { totalAmount: true },
          where: {
            createdAt: { gte: startOfToday },
            status: { in: [1, 2, 3] }
          }
        }),
        this.prisma.user.count(),
        this.prisma.order.count({ where: { status: 0 } }),
        this.prisma.orderItem.groupBy({
          by: ['productId', 'productTitle', 'productCover'],
          _sum: { quantity: true, price: true },
          where: {
            order: { status: { in: [1, 2, 3] } }
          },
          orderBy: { _sum: { quantity: 'desc' } },
          take: 10
        })
      ])

    const topProducts = topRows.map((row) => {
      const sum = row._sum ?? { quantity: 0, price: new Prisma.Decimal(0) }
      const qty = sum.quantity ?? 0
      const price = (sum.price ?? new Prisma.Decimal(0)) as Prisma.Decimal
      return {
        productId: row.productId,
        title: row.productTitle,
        cover: row.productCover,
        sales: qty,
        gmv: Number(price.mul(qty).toFixed(2))
      }
    })

    const pendingOrderList = (
      await this.prisma.order.findMany({
        where: { status: 0 },
        orderBy: [{ id: 'desc' }],
        take: 5,
        include: {
          user: { select: { username: true, nickname: true } }
        }
      })
    ).map((o) => ({
      id: o.id,
      orderNo: o.orderNo,
      totalAmount: Number(o.totalAmount),
      createdAt: o.createdAt,
      user: { username: o.user.username, nickname: o.user.nickname }
    }))

    return {
      todayOrders: todayOrderCount,
      todayGmv: Number((todayGmvAgg._sum.totalAmount ?? 0).toFixed(2)),
      totalUsers,
      pendingOrders,
      topProducts,
      pendingOrderList
    }
  }

  async salesTrend(days: number): Promise<SalesTrendPoint[]> {
    const safeDays = Math.min(Math.max(days, 1), 30)
    const today = this.startOfDay(new Date())
    const start = new Date(today)
    start.setDate(start.getDate() - (safeDays - 1))

    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: start },
        status: { in: [1, 2, 3] }
      },
      select: { totalAmount: true, createdAt: true }
    })

    const buckets = new Map<string, { amount: number; count: number }>()
    for (let i = 0; i < safeDays; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      buckets.set(this.dayKey(d), { amount: 0, count: 0 })
    }

    for (const o of orders) {
      const key = this.dayKey(o.createdAt)
      const b = buckets.get(key)
      if (b) {
        b.amount += Number(o.totalAmount)
        b.count += 1
      }
    }

    return Array.from(buckets.entries()).map(([date, v]) => ({
      date,
      amount: Number(v.amount.toFixed(2)),
      count: v.count
    }))
  }

  private startOfDay(d: Date): Date {
    const x = new Date(d)
    x.setHours(0, 0, 0, 0)
    return x
  }

  private dayKey(d: Date): string {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
}
