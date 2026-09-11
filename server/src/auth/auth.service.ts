import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../prisma/prisma.service'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'

export interface JwtPayload {
  sub: number
  username: string
}

export interface AuthResult {
  token: string
  user: {
    id: number
    username: string
    nickname: string | null
    avatar: string | null
    phone: string | null
  }
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService
  ) {}

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({ where: { username: dto.username } })
    if (!user) throw new UnauthorizedException('用户名或密码错误')

    const ok = await bcrypt.compare(dto.password, user.passwordHash)
    if (!ok) throw new UnauthorizedException('用户名或密码错误')

    return this.issueToken(user)
  }

  async register(dto: RegisterDto): Promise<AuthResult> {
    const exists = await this.prisma.user.findUnique({ where: { username: dto.username } })
    if (exists) throw new ConflictException('用户名已存在')

    const passwordHash = await bcrypt.hash(dto.password, 10)
    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        passwordHash,
        nickname: dto.nickname ?? dto.username,
        phone: dto.phone,
        avatar: dto.avatar
      }
    })
    return this.issueToken(user)
  }

  private async issueToken(user: {
    id: number
    username: string
    nickname: string | null
    avatar: string | null
    phone: string | null
  }): Promise<AuthResult> {
    const payload: JwtPayload = { sub: user.id, username: user.username }
    const token = await this.jwt.signAsync(payload, {
      expiresIn: this.config.get<string>('JWT_EXPIRES_IN', '7d') as unknown as number
    })
    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar,
        phone: user.phone
      }
    }
  }
}