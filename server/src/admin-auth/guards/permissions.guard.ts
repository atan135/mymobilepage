import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { Reflector } from '@nestjs/core'
import { PERMISSIONS_KEY } from '../decorators/require-permission.decorator'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'
import type { AdminPermission } from '../types'

export interface AdminAuthedUser {
  sub: number
  username: string
  role: string
  permissions: AdminPermission[]
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly config: ConfigService
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    // 0. 公开路由直接放行
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [ctx.getHandler(), ctx.getClass()])
    if (isPublic) return true

    // 本守卫只覆盖 /api/admin/* 后台接口。客户端公开接口（/api/categories、
    // /api/banners 等）由自身是否挂 @UseGuards(JwtAuthGuard) 决定，
    // 后台子模块的路由全在 /api/admin/* 下，命中后才有 token + 权限校验。
    const req = ctx.switchToHttp().getRequest<{ path: string }>()
    if (!req.path.startsWith('/api/admin')) return true

    // 1. 校验 Bearer Token + 把 payload 挂到 req.user
    const authedReq = ctx.switchToHttp().getRequest<{ user?: AdminAuthedUser; headers: Record<string, string | undefined> }>()
    const auth = authedReq.headers['authorization']
    if (!auth?.startsWith('Bearer ')) {
      throw new UnauthorizedException('未登录或 Token 缺失')
    }
    let payload: AdminAuthedUser
    try {
      const decoded = await this.jwt.verifyAsync(auth.slice(7), {
        secret: this.config.get<string>('JWT_ADMIN_SECRET') ?? 'dev-admin-secret'
      })
      payload = {
        sub: decoded.sub,
        username: decoded.username,
        role: decoded.role,
        permissions: decoded.permissions ?? []
      }
      authedReq.user = payload
    } catch {
      throw new UnauthorizedException('Token 无效或已过期')
    }

    // 2. 检查 @RequirePermission（没有标 = 只要求登录，已通过上面）
    const required = this.reflector.getAllAndOverride<AdminPermission[]>(
      PERMISSIONS_KEY,
      [ctx.getHandler(), ctx.getClass()]
    )
    if (!required || required.length === 0) return true

    if (payload.permissions.includes('*')) return true

    const ok = required.some((p) => payload.permissions.includes(p))
    if (!ok) {
      throw new ForbiddenException(`缺少权限: ${required.join(' / ')}`)
    }
    return true
  }
}
