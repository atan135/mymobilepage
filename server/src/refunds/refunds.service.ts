import {
  BadRequestException,
  Injectable,
  NotFoundException
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import type { PaginatedResult } from '../common/dto/pagination.dto'
import { CreateRefundDto, QueryMyRefundDto } from './dto/refund.dto'

@Injectable()
export class RefundsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateRefundDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId }
    })
    if (!order || order.userId !== userId) {
      throw new NotFoundException('订单不存在')
    }
    // 仅已发货 (2) 或已完成 (3) 可申请退款
    if (order.status !== 2 && order.status !== 3) {
      throw new BadRequestException(
        `当前订单状态（${order.status}）不可申请退款`
      )
    }
    if (Number(order.totalAmount) < dto.amount) {
      throw new BadRequestException(
        `退款金额不能超过订单总额 ¥${Number(order.totalAmount).toFixed(2)}`
      )
    }

    // 先 findUnique 预校验, 给出更友好的 4xx 错误；
    // DB 上 orderId 已有 @unique 约束, 即使并发请求都通过预校验,
    // 后到的 create 也会触发 Prisma P2002, 此处统一捕获并转译为 BadRequest。
    const existing = await this.prisma.refundRequest.findUnique({
      where: { orderId: dto.orderId }
    })
    if (existing) {
      throw new BadRequestException('该订单已存在退款申请')
    }

    try {
      return await this.prisma.refundRequest.create({
        data: {
          orderId: dto.orderId,
          reason: dto.reason,
          amount: new Prisma.Decimal(dto.amount.toFixed(2)),
          status: 0
        }
      })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException('该订单已存在退款申请')
      }
      throw e
    }
  }

  async listMy(
    userId: number,
    q: QueryMyRefundDto
  ): Promise<PaginatedResult<unknown>> {
    const page = q.page ?? 1
    const pageSize = q.pageSize ?? 10
    const where: Prisma.RefundRequestWhereInput = {
      order: { userId }
    }
    if (q.status !== undefined) where.status = q.status

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
              status: true
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

  async findOne(userId: number, id: number) {
    const r = await this.prisma.refundRequest.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            id: true,
            orderNo: true,
            totalAmount: true,
            status: true,
            userId: true
          }
        }
      }
    })
    if (!r) throw new NotFoundException('退款申请不存在')
    if (r.order?.userId !== userId) {
      throw new NotFoundException('退款申请不存在')
    }
    return {
      ...r,
      amount: Number(r.amount),
      order: r.order
        ? { ...r.order, totalAmount: Number(r.order.totalAmount) }
        : null
    }
  }
}
