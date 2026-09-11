import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import type { SettingUpdateItem } from './dto/setting.dto'

@Injectable()
export class AdminSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const rows = await this.prisma.setting.findMany({
      orderBy: [{ group: 'asc' }, { key: 'asc' }]
    })
    return { list: rows }
  }

  /**
   * 批量 upsert：updates 数组逐项写入。
   * 已存在的 key → update value / updatedAt；
   * 不存在的 key → create（需要从 description / group 推断？本接口不创建新 key，仅更新现有 key）。
   */
  async bulkUpsert(updates: SettingUpdateItem[]) {
    const ops = updates.map((u) =>
      this.prisma.setting.upsert({
        where: { key: u.key },
        update: { value: u.value as Prisma.InputJsonValue },
        create: {
          key: u.key,
          value: u.value as Prisma.InputJsonValue,
          group: 'general'
        }
      })
    )
    const rows = await this.prisma.$transaction(ops)
    return { count: rows.length }
  }
}
