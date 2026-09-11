import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByUsername(username: string) {
    return this.prisma.user.findUnique({ where: { username } })
  }

  findById(id: number) {
    return this.prisma.user.findUnique({ where: { id } })
  }

  async getProfile(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } })
    if (!user) throw new NotFoundException('User not found')
    const { passwordHash: _omit, ...safe } = user
    return safe
  }
}