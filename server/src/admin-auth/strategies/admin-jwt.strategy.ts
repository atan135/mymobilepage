import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import type { AdminPermission } from '../types'

export interface AdminJwtPayload {
  sub: number
  username: string
  role: string
  permissions: AdminPermission[]
}

export interface AdminJwtUser {
  sub: number
  username: string
  role: string
  permissions: AdminPermission[]
}

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ADMIN_SECRET') ?? 'dev-admin-secret'
    })
  }

  validate(payload: AdminJwtPayload): AdminJwtUser {
    return {
      sub: payload.sub,
      username: payload.username,
      role: payload.role,
      permissions: payload.permissions
    }
  }
}