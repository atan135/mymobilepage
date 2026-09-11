import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { QueryUserDto } from './dto/query-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import type { PaginatedResult } from '../common/dto/pagination.dto'

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: QueryUserDto): Promise<PaginatedResult<unknown>> {
    const page = q.page ?? 1
    const pageSize = q.pageSize ?? 10
    const where = {
      ...(q.keyword
        ? {
            OR: [
              { username: { contains: q.keyword, mode: 'insensitive' as const } },
              { nickname: { contains: q.keyword, mode: 'insensitive' as const } },
              { phone: { contains: q.keyword, mode: 'insensitive' as const } }
            ]
          }
        : {})
    }

    const [total, list] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: [{ id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ])

    return {
      list: list.map((u) => {
        const { passwordHash: _, ...rest } = u
        return rest
      }),
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total
    }
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { _count: { select: { orders: true } } }
    })
    if (!user) throw new NotFoundException('用户不存在')
    const { passwordHash: _, ...safe } = user
    return safe
  }

  async update(id: number, dto: UpdateUserDto) {
    await this.findOne(id)
    return this.prisma.user.update({ where: { id }, data: dto })
  }
}


