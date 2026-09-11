import {
  BadRequestException,
  Injectable,
  NotFoundException
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import type { PaginatedResult } from '../common/dto/pagination.dto'
import {
  CreateCouponDto,
  GrantCouponDto,
  QueryClaimsDto,
  QueryCouponDto,
  UpdateCouponDto,
  UpdateCouponStatusDto
} from './dto/coupon.dto'

@Injectable()
export class AdminCouponsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: QueryCouponDto): Promise<PaginatedResult<unknown>> {
    const page = q.page ?? 1
    const pageSize = q.pageSize ?? 10
    const where: Prisma.CouponWhereInput = {}
    if (q.status !== undefined) where.status = q.status
    if (q.type !== undefined) where.type = q.type
    if (q.keyword) {
      where.OR = [
        { name: { contains: q.keyword, mode: 'insensitive' } },
        { description: { contains: q.keyword, mode: 'insensitive' } }
      ]
    }

    const [total, list] = await this.prisma.$transaction([
      this.prisma.coupon.count({ where }),
      this.prisma.coupon.findMany({
        where,
        orderBy: [{ id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { _count: { select: { userCoupons: true } } }
      })
    ])

    return {
      list: list.map((c) => ({
        ...c,
        amount: Number(c.amount),
        threshold: c.threshold !== null ? Number(c.threshold) : null,
        claimed: c._count.userCoupons
      })),
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total
    }
  }

  async findOne(id: number) {
    const c = await this.prisma.coupon.findUnique({
      where: { id },
      include: { _count: { select: { userCoupons: true } } }
    })
    if (!c) throw new NotFoundException('优惠券不存在')
    return {
      ...c,
      amount: Number(c.amount),
      threshold: c.threshold !== null ? Number(c.threshold) : null,
      claimed: c._count.userCoupons
    }
  }

  async create(dto: CreateCouponDto) {
    return this.prisma.coupon.create({
      data: {
        name: dto.name,
        type: dto.type,
        threshold:
          dto.threshold !== undefined && dto.threshold !== null
            ? new Prisma.Decimal(dto.threshold.toFixed(2))
            : null,
        amount: new Prisma.Decimal(dto.amount.toFixed(2)),
        description: dto.description ?? null,
        validFrom: new Date(dto.validFrom),
        validTo: new Date(dto.validTo),
        total: dto.total,
        perUserLimit: dto.perUserLimit ?? 1,
        status: dto.status ?? 1
      }
    })
  }

  async update(id: number, dto: UpdateCouponDto) {
    await this.findOne(id)
    const data: Prisma.CouponUpdateInput = {}
    if (dto.name !== undefined) data.name = dto.name
    if (dto.type !== undefined) data.type = dto.type
    if (dto.threshold !== undefined) {
      data.threshold =
        dto.threshold === null
          ? null
          : new Prisma.Decimal(dto.threshold.toFixed(2))
    }
    if (dto.amount !== undefined) {
      data.amount = new Prisma.Decimal(dto.amount.toFixed(2))
    }
    if (dto.description !== undefined) data.description = dto.description
    if (dto.validFrom !== undefined) data.validFrom = new Date(dto.validFrom)
    if (dto.validTo !== undefined) data.validTo = new Date(dto.validTo)
    if (dto.total !== undefined) data.total = dto.total
    if (dto.perUserLimit !== undefined) data.perUserLimit = dto.perUserLimit
    if (dto.status !== undefined) data.status = dto.status
    return this.prisma.coupon.update({ where: { id }, data })
  }

  async updateStatus(id: number, dto: UpdateCouponStatusDto) {
    await this.findOne(id)
    return this.prisma.coupon.update({
      where: { id },
      data: { status: dto.status }
    })
  }

  async remove(id: number) {
    await this.findOne(id)
    const claimed = await this.prisma.userCoupon.count({ where: { couponId: id } })
    if (claimed > 0) {
      throw new BadRequestException('该优惠券已被领取，无法删除')
    }
    return this.prisma.coupon.delete({ where: { id } })
  }

  async listClaims(
    couponId: number,
    q: QueryClaimsDto
  ): Promise<PaginatedResult<unknown>> {
    await this.findOne(couponId)
    const page = q.page ?? 1
    const pageSize = q.pageSize ?? 10
    const where: Prisma.UserCouponWhereInput = { couponId }
    if (q.status !== undefined) where.status = q.status
    if (q.source !== undefined) where.source = q.source

    const [total, list] = await this.prisma.$transaction([
      this.prisma.userCoupon.count({ where }),
      this.prisma.userCoupon.findMany({
        where,
        orderBy: [{ id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: {
            select: { id: true, username: true, nickname: true, phone: true }
          }
        }
      })
    ])

    return {
      list: list.map((uc) => ({
        id: uc.id,
        userId: uc.userId,
        user: uc.user,
        status: uc.status,
        source: uc.source,
        receivedAt: uc.receivedAt.toISOString(),
        usedAt: uc.usedAt !== null ? uc.usedAt.toISOString() : null,
        expiresAt: uc.expiresAt !== null ? uc.expiresAt.toISOString() : null,
        orderId: uc.orderId
      })),
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total
    }
  }

  /**
   * 手动发放给指定用户。已领取过（达到 perUserLimit）的用户自动跳过；
   * 单次最多发放到总数达限。
   */
  async grant(couponId: number, dto: GrantCouponDto) {
    const coupon = await this.findOne(couponId)
    if (coupon.status !== 1) throw new BadRequestException('该优惠券已停用')

    const now = new Date()
    if (coupon.validFrom > now) throw new BadRequestException('该优惠券尚未开始发放')
    if (coupon.validTo < now) throw new BadRequestException('该优惠券已过期')

    const userIds = Array.from(new Set(dto.userIds))

    const existing = await this.prisma.userCoupon.findMany({
      where: { couponId, userId: { in: userIds } },
      select: { userId: true }
    })
    const existingUserIds = new Set(existing.map((e) => e.userId))
    const newUserIds = userIds.filter((id) => !existingUserIds.has(id))
    if (newUserIds.length === 0) {
      throw new BadRequestException('所选用户均已领取过该优惠券')
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: newUserIds } },
      select: { id: true }
    })
    const validUserIds = users.map((u) => u.id)
    if (validUserIds.length === 0) {
      throw new BadRequestException('所选用户不存在')
    }

    const totalClaimed = await this.prisma.userCoupon.count({ where: { couponId } })
    const remaining = coupon.total - totalClaimed
    if (remaining <= 0) {
      throw new BadRequestException('该优惠券已被领完')
    }
    const grantCount = Math.min(validUserIds.length, remaining)
    const grantUserIds = validUserIds.slice(0, grantCount)

    await this.prisma.userCoupon.createMany({
      data: grantUserIds.map((userId) => ({
        userId,
        couponId,
        status: 0,
        source: 1,
        expiresAt: coupon.validTo
      }))
    })

    return {
      granted: grantCount,
      skipped: userIds.length - grantCount,
      remaining: remaining - grantCount
    }
  }
}
