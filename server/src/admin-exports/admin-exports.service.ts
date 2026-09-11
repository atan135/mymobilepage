import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import * as XLSX from 'xlsx'
import { PrismaService } from '../prisma/prisma.service'
import { ORDER_STATUS_LABELS } from '../admin-orders/dto/order.dto'
import { INVENTORY_TYPE_LABELS } from '../inventory/inventory.service'
import { ExportOrdersDto, ExportProductsDto, ExportInventoryLogsDto } from './dto/export.dto'

@Injectable()
export class AdminExportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 导出订单。dateFrom / dateTo 均为可选；不传则全量。
   */
  async exportOrders(q: ExportOrdersDto): Promise<Buffer> {
    const where: Prisma.OrderWhereInput = {}
    if (q.status !== undefined) where.status = q.status
    if (q.keyword) {
      where.OR = [
        { orderNo: { contains: q.keyword, mode: 'insensitive' } },
        { user: { username: { contains: q.keyword, mode: 'insensitive' } } },
        { user: { nickname: { contains: q.keyword, mode: 'insensitive' } } }
      ]
    }
    if (q.dateFrom || q.dateTo) {
      where.createdAt = {}
      if (q.dateFrom) where.createdAt.gte = new Date(q.dateFrom)
      if (q.dateTo) where.createdAt.lte = this.parseDateTo(q.dateTo)
    }

    const rows = await this.prisma.order.findMany({
      where,
      orderBy: [{ id: 'desc' }],
      include: {
        user: { select: { username: true, nickname: true } }
      }
    })

    const data = rows.map((o) => {
      const receiver = (o.receiver ?? {}) as Record<string, unknown>
      return {
        '订单号': o.orderNo,
        '用户名': o.user?.username ?? '',
        '用户昵称': o.user?.nickname ?? '',
        '订单状态': ORDER_STATUS_LABELS[o.status as keyof typeof ORDER_STATUS_LABELS] ?? String(o.status),
        '商品总额': o.originalAmount ? Number(o.originalAmount).toFixed(2) : '',
        '优惠金额': o.discountAmount ? Number(o.discountAmount).toFixed(2) : '0.00',
        '实付金额': Number(o.totalAmount).toFixed(2),
        '收件人': String(receiver.name ?? ''),
        '收件手机': String(receiver.phone ?? ''),
        '收货地址': String(receiver.address ?? ''),
        '物流公司': o.shipCompany ?? '',
        '物流单号': o.shipNo ?? '',
        '备注': o.remark ?? '',
        '创建时间': this.fmt(o.createdAt),
        '付款时间': o.paidAt ? this.fmt(o.paidAt) : '',
        '发货时间': o.shippedAt ? this.fmt(o.shippedAt) : '',
        '完成时间': o.completedAt ? this.fmt(o.completedAt) : ''
      }
    })
    return this.toXlsx(data, '订单')
  }

  /**
   * 导出商品。
   */
  async exportProducts(q: ExportProductsDto): Promise<Buffer> {
    const where: Prisma.ProductWhereInput = {}
    if (q.categoryId !== undefined) where.categoryId = q.categoryId
    if (q.status !== undefined) where.status = q.status
    if (q.keyword) where.title = { contains: q.keyword, mode: 'insensitive' }

    const rows = await this.prisma.product.findMany({
      where,
      orderBy: [{ id: 'desc' }],
      include: { category: { select: { name: true } } }
    })

    const data = rows.map((p) => ({
      '商品 ID': p.id,
      '商品标题': p.title,
      '分类': p.category.name,
      '当前售价': Number(p.price).toFixed(2),
      '原价': p.originalPrice ? Number(p.originalPrice).toFixed(2) : '',
      '库存': p.stock,
      '阈值': p.threshold,
      '已售': p.sales,
      '状态': p.status === 1 ? '上架' : '下架',
      '上架时间': this.fmt(p.createdAt)
    }))
    return this.toXlsx(data, '商品')
  }

  /**
   * 导出库存流水。dateFrom / dateTo 均为可选。
   */
  async exportInventoryLogs(q: ExportInventoryLogsDto): Promise<Buffer> {
    const where: Prisma.InventoryLogWhereInput = {}
    if (q.productId !== undefined) where.productId = q.productId
    if (q.type !== undefined) where.type = q.type
    if (q.keyword) {
      where.product = { title: { contains: q.keyword, mode: 'insensitive' } }
    }
    if (q.dateFrom || q.dateTo) {
      where.createdAt = {}
      if (q.dateFrom) where.createdAt.gte = new Date(q.dateFrom)
      if (q.dateTo) where.createdAt.lte = this.parseDateTo(q.dateTo)
    }

    const rows = await this.prisma.inventoryLog.findMany({
      where,
      orderBy: [{ id: 'desc' }],
      include: {
        product: { select: { id: true, title: true } },
        operator: { select: { username: true, nickname: true } }
      }
    })

    const data = rows.map((r) => ({
      '流水 ID': r.id,
      '商品 ID': r.productId,
      '商品标题': r.product.title,
      '类型': INVENTORY_TYPE_LABELS[r.type as keyof typeof INVENTORY_TYPE_LABELS] ?? String(r.type),
      '变更数量': r.quantity,
      '变更前库存': r.beforeStock,
      '变更后库存': r.afterStock,
      '原因': r.reason ?? '',
      '操作人 ID': r.operatorId ?? '',
      '操作人用户名': r.operator?.username ?? '系统',
      '操作人昵称': r.operator?.nickname ?? '',
      '时间': this.fmt(r.createdAt)
    }))
    return this.toXlsx(data, '库存流水')
  }

  /**
   * JSON → xlsx Buffer。第一行 header。
   */
  private toXlsx(rows: Record<string, unknown>[], sheetName: string): Buffer {
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  }

  private fmt(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0')
    return [
      d.getFullYear(),
      pad(d.getMonth() + 1),
      pad(d.getDate())
    ].join('-') + ' ' + [
      pad(d.getHours()),
      pad(d.getMinutes()),
      pad(d.getSeconds())
    ].join(':')
  }

  /**
   * 解析 dateTo：若仅含日期（无 T/时分秒），补到当天 23:59:59.999，
   * 避免 "2026-09-11" 被 new Date 解析为 00:00:00 导致全天数据被滤掉。
   * 含时分秒或已是 ISO 时间戳则原样解析。
   */
  private parseDateTo(dateTo: string): Date {
    if (/^d{4}-d{2}-d{2}$/.test(dateTo)) {
      return new Date(`${dateTo}T23:59:59.999Z`)
    }
    return new Date(dateTo)
  }
}
