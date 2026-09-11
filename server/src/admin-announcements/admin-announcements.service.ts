import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import {
  CreateAnnouncementDto,
  UpdateAnnouncementDto
} from './dto/announcement.dto'

@Injectable()
export class AdminAnnouncementsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.announcement.findMany({
      orderBy: [{ sort: 'asc' }, { id: 'desc' }]
    })
  }

  async findOne(id: number) {
    const a = await this.prisma.announcement.findUnique({ where: { id } })
    if (!a) throw new NotFoundException('公告不存在')
    return a
  }

  create(dto: CreateAnnouncementDto) {
    return this.prisma.announcement.create({
      data: {
        ...dto,
        publishedAt: dto.status === 1 ? new Date() : null
      }
    })
  }

  async update(id: number, dto: UpdateAnnouncementDto) {
    await this.findOne(id)
    const existing = await this.prisma.announcement.findUnique({ where: { id } })
    const newStatus = dto.status ?? existing!.status
    return this.prisma.announcement.update({
      where: { id },
      data: {
        ...dto,
        publishedAt:
          newStatus === 1 && !existing!.publishedAt ? new Date() : existing!.publishedAt
      }
    })
  }

  async publish(id: number) {
    const a = await this.findOne(id)
    return this.prisma.announcement.update({
      where: { id: a.id },
      data: { status: 1, publishedAt: a.publishedAt ?? new Date() }
    })
  }

  async unpublish(id: number) {
    await this.findOne(id)
    return this.prisma.announcement.update({
      where: { id },
      data: { status: 0 }
    })
  }

  async remove(id: number) {
    await this.findOne(id)
    return this.prisma.announcement.delete({ where: { id } })
  }
}