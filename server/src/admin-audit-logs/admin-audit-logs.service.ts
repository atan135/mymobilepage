import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import type { PaginatedResult } from '../common/dto/pagination.dto'
import type { QueryAuditLogDto } from './dto/audit-log.dto'

@Injectable()
export class AdminAuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: QueryAuditLogDto): Promise<PaginatedResult<unknown>> {
    const page = q.page ?? 1
    const pageSize = q.pageSize ?? 20
    const where: Prisma.AuditLogWhereInput = {}
    if (q.adminId !== undefined) where.adminId = q.adminId
    if (q.resource) where.resource = { contains: q.resource, mode: 'insensitive' }
    if (q.action) where.action = { contains: q.action, mode: 'insensitive' }
    if (q.dateFrom || q.dateTo) {
      where.createdAt = {}
      if (q.dateFrom) where.createdAt.gte = new Date(q.dateFrom)
      if (q.dateTo) where.createdAt.lte = new Date(q.dateTo)
    }

    const [total, list] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: [{ id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          admin: { select: { id: true, username: true, nickname: true } }
        }
      })
    ])

    return { list, total, page, pageSize, hasMore: page * pageSize < total }
  }
}
