import {
  BadRequestException,
  Injectable,
  NotFoundException
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import type { PaginatedResult } from '../common/dto/pagination.dto'
import {
  QueryReviewDto,
  REVIEW_TRANSITIONS,
  ReplyReviewDto,
  type ReviewStatus
} from './dto/review.dto'

@Injectable()
export class AdminReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: QueryReviewDto): Promise<PaginatedResult<unknown>> {
    const page = q.page ?? 1
    const pageSize = q.pageSize ?? 10
    const where: Prisma.ReviewWhereInput = {}
    if (q.status !== undefined) where.status = q.status
    if (q.rating !== undefined) where.rating = q.rating
    if (q.keyword) {
      where.OR = [
        { content: { contains: q.keyword, mode: 'insensitive' } },
        { user: { username: { contains: q.keyword, mode: 'insensitive' } } },
        { product: { title: { contains: q.keyword, mode: 'insensitive' } } }
      ]
    }

    const [total, list] = await this.prisma.$transaction([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where,
        orderBy: [{ id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          product: { select: { id: true, title: true, cover: true } },
          user: { select: { id: true, username: true, nickname: true } }
        }
      })
    ])

    return {
      list,
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total
    }
  }

  async findOne(id: number) {
    const r = await this.prisma.review.findUnique({
      where: { id },
      include: {
        product: { select: { id: true, title: true, cover: true } },
        user: {
          select: { id: true, username: true, nickname: true, phone: true }
        }
      }
    })
    if (!r) throw new NotFoundException('评价不存在')
    return r
  }

  async approve(id: number) {
    const r = await this.findOne(id)
    this.assertTransition(r.status, 1)
    return this.prisma.review.update({
      where: { id },
      data: { status: 1 }
    })
  }

  async block(id: number) {
    const r = await this.findOne(id)
    this.assertTransition(r.status, 2)
    return this.prisma.review.update({
      where: { id },
      data: { status: 2 }
    })
  }

  /**
   * 设置或清除回复。空串视为清除。
   */
  async reply(id: number, dto: ReplyReviewDto) {
    await this.findOne(id)
    const trimmed = dto.reply.trim()
    return this.prisma.review.update({
      where: { id },
      data: { reply: trimmed === '' ? null : trimmed }
    })
  }

  private assertTransition(from: number, to: ReviewStatus) {
    const allowed = REVIEW_TRANSITIONS[from as ReviewStatus] ?? []
    if (!allowed.includes(to)) {
      throw new BadRequestException(
        `评价状态不允许从 ${from} 切换到 ${to}`
      )
    }
  }
}
