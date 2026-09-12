import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Observable, tap } from 'rxjs'
import type { Request } from 'express'
import { AuditService } from './audit.service'
import { PERMISSIONS_KEY } from '../admin-auth/decorators/require-permission.decorator'

/**
 * 需要写审计的 HTTP 方法。
 */
const WRITE_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE'])

/**
 * payload 敏感字段黑名单：写日志前过滤掉这些 key 及其值。
 *
 * 覆盖三类敏感数据：
 * 1) 凭证：password / token
 * 2) PII：phone / address / email / idCard / realName / bankCard / bankAccount
 * 3) 后台内部：passwordHash / newPassword / oldPassword / accessToken / refreshToken / secret
 *
 * 注意：仅为脱敏；真正生产环境还应配合字段级加密 + 审计日志访问控制。
 */
const SENSITIVE_KEYS = new Set([
  'password',
  'passwordHash',
  'newPassword',
  'oldPassword',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
  'phone',
  'mobile',
  'email',
  'address',
  'receiver',
  'idCard',
  'idCardNo',
  'realName',
  'bankCard',
  'bankAccount'
])

function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitize)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(k)) {
        out[k] = '***'
      } else {
        out[k] = sanitize(v)
      }
    }
    return out
  }
  return value
}

/**
 * 从 URL segments 解析 resource / resourceId / action。
 * 约定：去掉 api/admin 前缀后，
 *   - 第一段 = resource（如 products / orders / coupons）
   - 数字段 = resourceId
 *   - 非数字末尾段（且非首段）= subAction 后缀
 */
function parseUrl(url: string, method: string): { resource: string; resourceId: number | null; action: string } {
  const cleaned = url.split('?')[0].replace(/^\/+/, '')
  const segs = cleaned.split('/').filter((s) => s && s !== 'api' && s !== 'admin')
  const resource = segs[0] ?? 'unknown'
  const numericIdx = segs.findIndex((s, i) => i > 0 && /^\d+$/.test(s))
  const resourceId = numericIdx >= 0 ? Number(segs[numericIdx]) : null
  const last = segs[segs.length - 1]
  const isSubAction = last && !/^\d+$/.test(last) && last !== resource
  // action 优先级：subAction 路径段 > HTTP 方法
  let action = method.toLowerCase()
  if (isSubAction) {
    action = String(last)
  } else if (method === 'POST' && segs.length === 1) {
    action = 'create'
  } else if (method === 'DELETE') {
    action = 'delete'
  } else if (method === 'PATCH' || method === 'PUT') {
    action = 'update'
  }
  return { resource, resourceId, action }
}

/**
 * 优先从响应里拿 id，否则用 URL 解析的。
 */
function pickResourceId(parsed: number | null, data: unknown): number | null {
  if (typeof data === 'object' && data !== null && 'id' in data) {
    const id = (data as { id: unknown }).id
    if (typeof id === 'number') return id
    if (typeof id === 'string' && /^\d+$/.test(id)) return Number(id)
  }
  return parsed
}

function pickIp(req: Request): string | null {
  const xff = req.headers['x-forwarded-for']
  if (typeof xff === 'string' && xff.length > 0) return xff.split(',')[0].trim()
  if (Array.isArray(xff) && xff.length > 0) return String(xff[0])
  return req.ip ?? req.socket.remoteAddress ?? null
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly audit: AuditService,
    private readonly reflector: Reflector
  ) {}

  /**
   * 从 @RequirePermission 元数据读取权限码，优先用其作为 action，
   * 保证 audit_log.action 与权限系统一致；解析不到时退回 URL 推断。
   */
  private resolveAction(ctx: ExecutionContext, fallback: string): string {
    const perms = this.reflector.getAllAndOverride<string[] | undefined>(
      PERMISSIONS_KEY,
      [ctx.getHandler(), ctx.getClass()]
    )
    if (perms && perms.length > 0) return perms[0]
    return fallback
  }

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<Request & {
      user?: { sub?: number }
      body?: unknown
    }>()
    const url = req.originalUrl ?? req.url
    if (!url.startsWith('/api/admin')) return next.handle()
    const method = req.method
    if (!WRITE_METHODS.has(method)) return next.handle()

    const parsed = parseUrl(url, method)
    const meta = { ...parsed, action: this.resolveAction(ctx, parsed.action) }
    const adminId = req.user?.sub ?? null
    const ip = pickIp(req)
    const userAgent =
      typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null
    const payloadRaw = req.body ?? null
    const payload = payloadRaw ? sanitize(payloadRaw) : null

    return next.handle().pipe(
      tap({
        next: (data) => {
          const resourceId = pickResourceId(meta.resourceId, data)
          this.audit
            .write({
              adminId,
              action: meta.action,
              resource: meta.resource,
              resourceId,
              payload,
              ip,
              userAgent
            })
            .catch((e: unknown) => console.error('[AuditInterceptor] write failed:', e))
        },
        error: (err: unknown) => {
          // 失败请求也写一条日志，方便审计越权尝试 / 业务异常
          this.audit
            .write({
              adminId,
              action: meta.action + '_failed',
              resource: meta.resource,
              resourceId: meta.resourceId,
              payload: {
                ...((payload && typeof payload === 'object'
                  ? (payload as Record<string, unknown>)
                  : {})),
                errorMessage: err instanceof Error ? err.message : String(err)
              },
              ip,
              userAgent
            })
            .catch((e: unknown) => console.error('[AuditInterceptor] write failed:', e))
        }
      })
    )
  }
}
