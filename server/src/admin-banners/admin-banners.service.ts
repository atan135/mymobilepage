import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateBannerDto, UpdateBannerDto } from './dto/banner.dto'

@Injectable()
export class AdminBannersService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.banner.findMany({ orderBy: [{ sort: 'asc' }, { id: 'desc' }] })
  }

  async findOne(id: number) {
    const b = await this.prisma.banner.findUnique({ where: { id } })
    if (!b) throw new NotFoundException('轮播图不存在')
    return b
  }

  create(dto: CreateBannerDto) {
    return this.prisma.banner.create({ data: dto })
  }

  async update(id: number, dto: UpdateBannerDto) {
    await this.findOne(id)
    return this.prisma.banner.update({ where: { id }, data: dto })
  }

  async remove(id: number) {
    await this.findOne(id)
    return this.prisma.banner.delete({ where: { id } })
  }
}