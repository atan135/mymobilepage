import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

/**
 * 写入审计日志的字段。
 * payload 已在外层（拦截器）做过敏感字段过滤。
 */
export interface AuditLogInput {
  adminId?: number | null
  action: string
  resource: string
  resourceId?: number | null
  payload?: unknown
  ip?: string | null
  userAgent?: string | null
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 异步写日志，不抛错（拦截器已 catch）。
   */
  async write(input: AuditLogInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        adminId: input.adminId ?? null,
        action: input.action,
        resource: input.resource,
        resourceId: input.resourceId ?? null,
        payload: (input.payload ?? null) as never,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null
      }
    })
  }
}
