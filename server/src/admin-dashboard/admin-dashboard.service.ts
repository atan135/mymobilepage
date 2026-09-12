import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

export type DashboardPendingItemType = 'order' | 'refund'

export interface DashboardPendingItem {
  type: DashboardPendingItemType
  id: number
  refId: number
  title: string
  subtitle: string
  amount: number
  createdAt: Date
  status: number
}

export interface DashboardOverview {
  todayOrders: number
  todayGmv: number
  totalUsers: number
  pendingShipOrders: number
  pendingRefundReviews: number
  pendingRefunds: number
  topProducts: Array<{
    productId: number
    title: string
    cover: string
    sales: number
    gmv: number
  }>
  pendingItems: DashboardPendingItem[]
  lowStockCount: number
  lowStockProducts: Array<{
    id: number
    title: string
    cover: string
    stock: number
    threshold: number
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

    const [
      todayOrderCount,
      todayGmvAgg,
      totalUsers,
      pendingShipOrders,
      pendingRefundReviews,
      pendingRefunds,
      topRows,
      shipOrderRows,
      refundRows
    ] = await this.prisma.$transaction([
      this.prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: {
          createdAt: { gte: startOfToday },
          status: { in: [1, 2, 3] }
        }
      }),
      this.prisma.user.count(),
      this.prisma.order.count({ where: { status: 1 } }),
      this.prisma.refundRequest.count({ where: { status: 0 } }),
      this.prisma.refundRequest.count({ where: { status: 1 } }),
      this.prisma.orderItem.groupBy({
        by: ['productId', 'productTitle', 'productCover'],
        _sum: { quantity: true, price: true },
        where: {
          order: { status: { in: [1, 2, 3] } }
        },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 10
      }),
      this.prisma.order.findMany({
        where: { status: 1 },
        orderBy: [{ id: 'desc' }],
        take: 5,
        include: {
          user: { select: { username: true, nickname: true } }
        }
      }),
      this.prisma.refundRequest.findMany({
        where: { status: { in: [0, 1] } },
        orderBy: [{ id: 'desc' }],
        take: 5,
        include: {
          order: {
            select: {
              id: true,
              orderNo: true,
              user: { select: { username: true, nickname: true } }
            }
          }
        }
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

    // 混合待办：订单 (status=1 待发货) + 退款 (status=0 待审 / status=1 已批准)
    // 业务优先级：发货优先于退款；同类型内按 id desc。
    const merged: DashboardPendingItem[] = [
      ...shipOrderRows.map((o) => ({
        type: 'order' as const,
        id: o.id,
        refId: o.id,
        title: o.orderNo,
        subtitle: o.user.nickname ?? o.user.username,
        amount: Number(o.totalAmount),
        createdAt: o.createdAt,
        status: 1
      })),
      ...refundRows.map((r) => ({
        type: 'refund' as const,
        id: r.id,
        refId: r.id,
        title: r.order ? r.order.orderNo : `#${r.orderId}`,
        subtitle: r.order?.user
          ? (r.order.user.nickname ?? r.order.user.username)
          : '-',
        amount: Number(r.amount),
        createdAt: r.createdAt,
        status: r.status
      }))
    ]
    merged.sort((a, b) => {
      const pa = a.type === 'order' ? 0 : 1
      const pb = b.type === 'order' ? 0 : 1
      if (pa !== pb) return pa - pb
      return b.id - a.id
    })
    const pendingItems = merged.slice(0, 5)

    const onShelf = await this.prisma.product.findMany({
      where: { status: 1 },
      select: { id: true, title: true, cover: true, stock: true, threshold: true }
    })
    const lowStockAll = onShelf.filter((p) => p.stock <= p.threshold)
    lowStockAll.sort((a, b) => (b.threshold - b.stock) - (a.threshold - a.stock))
    const lowStockProducts = lowStockAll.slice(0, 5).map((p) => ({
      id: p.id,
      title: p.title,
      cover: p.cover,
      stock: p.stock,
      threshold: p.threshold
    }))

    return {
      todayOrders: todayOrderCount,
      todayGmv: Number((todayGmvAgg._sum.totalAmount ?? 0).toFixed(2)),
      totalUsers,
      pendingShipOrders,
      pendingRefundReviews,
      pendingRefunds,
      topProducts,
      pendingItems,
      lowStockCount: lowStockAll.length,
      lowStockProducts
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