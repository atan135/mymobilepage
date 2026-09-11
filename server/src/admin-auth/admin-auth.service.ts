import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../prisma/prisma.service'
import { AdminLoginDto } from './dto/login.dto'
import type { AdminJwtPayload } from './strategies/admin-jwt.strategy'
import type { AdminPermission } from './types'

export interface AdminLoginResult {
  token: string
  user: {
    id: number
    username: string
    nickname: string | null
    avatar: string | null
    role: string
    permissions: AdminPermission[]
  }
}

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService
  ) {}

  async login(dto: AdminLoginDto): Promise<AdminLoginResult> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { username: dto.username },
      include: { role: true }
    })
    if (!admin) throw new UnauthorizedException('账号或密码错误')
    if (admin.status !== 1) throw new ForbiddenException('账号已被禁用')

    const ok = await bcrypt.compare(dto.password, admin.passwordHash)
    if (!ok) throw new UnauthorizedException('账号或密码错误')

    await this.prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() }
    })

    return this.issueToken({
      id: admin.id,
      username: admin.username,
      nickname: admin.nickname,
      avatar: admin.avatar,
      roleCode: admin.role.code,
      permissions: admin.role.permissions as AdminPermission[]
    })
  }

  async logout(): Promise<void> {
    // JWT 是无状态的；这里只是占位。前端清掉 token 即可。
    return
  }

  async getProfile(adminId: number) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
      include: { role: true }
    })
    if (!admin) throw new NotFoundException('管理员不存在')

    return {
      id: admin.id,
      username: admin.username,
      nickname: admin.nickname,
      avatar: admin.avatar,
      role: admin.role.code,
      permissions: admin.role.permissions as AdminPermission[]
    }
  }

  private async issueToken(input: {
    id: number
    username: string
    nickname: string | null
    avatar: string | null
    roleCode: string
    permissions: AdminPermission[]
  }): Promise<AdminLoginResult> {
    const payload: AdminJwtPayload = {
      sub: input.id,
      username: input.username,
      role: input.roleCode,
      permissions: input.permissions
    }
    const token = await this.jwt.signAsync(payload, {
      expiresIn: this.config.get<string>('JWT_ADMIN_EXPIRES_IN', '7d') as unknown as number
    })
    return {
      token,
      user: {
        id: input.id,
        username: input.username,
        nickname: input.nickname,
        avatar: input.avatar,
        role: input.roleCode,
        permissions: input.permissions
      }
    }
  }
}