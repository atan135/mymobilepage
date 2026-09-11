import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PERMISSIONS_KEY } from '../decorators/require-permission.decorator'
import type { AdminPermission } from '../types'

export interface AdminAuthedUser {
  sub: number
  username: string
  role: string
  permissions: AdminPermission[]
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AdminPermission[]>(
      PERMISSIONS_KEY,
      [ctx.getHandler(), ctx.getClass()]
    )

    // 没标 @RequirePermission() 表示只要求登录（其它 Guard 负责登录校验）
    if (!required || required.length === 0) return true

    const req = ctx.switchToHttp().getRequest<{ user?: AdminAuthedUser }>()
    const user = req.user
    if (!user) throw new ForbiddenException('未登录')

    // 通配权限
    if (user.permissions.includes('*')) return true

    const ok = required.some((p) => user.permissions.includes(p))
    if (!ok) {
      throw new ForbiddenException(`缺少权限：${required.join(' / ')}`)
    }
    return true
  }
}