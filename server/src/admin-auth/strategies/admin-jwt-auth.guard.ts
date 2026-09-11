import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import type { Request } from 'express'
import type { AdminJwtPayload } from './admin-jwt.strategy'

@Injectable()
export class AdminJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request & { user?: AdminJwtPayload }>()
    const auth = req.headers['authorization']
    if (!auth?.startsWith('Bearer ')) {
      throw new UnauthorizedException('未登录或 Token 缺失')
    }
    const token = auth.slice(7)
    try {
      const payload = await this.jwt.verifyAsync(token, {
        secret: this.config.get<string>('JWT_ADMIN_SECRET') ?? 'dev-admin-secret'
      })
      req.user = payload
      return true
    } catch {
      throw new UnauthorizedException('Token 无效或已过期')
    }
  }
}