import { Controller, Get } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Controller('banners')
export class ClientBannersController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 客户端首页轮播：只返回启启用的项，按 sort asc 排。
   * 返回精简结构（id / image / link）方便移动端渲染。
   */
  @Get()
  async list() {
    const rows = await this.prisma.banner.findMany({
      where: { enabled: true },
      orderBy: [{ sort: 'asc' }, { id: 'asc' }],
      select: { id: true, image: true, link: true }
    })
    return rows
  }
}
