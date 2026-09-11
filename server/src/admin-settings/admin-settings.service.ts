import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
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
   * 批量 upsert：仅更新已存在的 key。
   *
   * 安全说明：原实现使用 Prisma upsert，遇到不存在的 key 会以 group=general 创建，
   * 配合 client-settings 仅按 key 前缀校验的漏洞，可被利用向客户端暴露任意
   * site_* / customer_service_* key。本次修复改为：
   * 1. 提前校验 key 去重；
   * 2. 仅允许 update 已存在的 key；不存在的 key 抛 NotFoundException。
   * 新 key 的引入必须通过 schema / 迁移或独立的 adminCreate 接口（带更严格的
   * group 白名单与权限校验）。
   */
  async bulkUpsert(updates: SettingUpdateItem[]) {
    if (updates.length === 0) return { count: 0 }

    const seen = new Set<string>()
    for (const u of updates) {
      if (seen.has(u.key)) {
        throw new BadRequestException(`duplicate key: ${u.key}`)
      }
      seen.add(u.key)
    }

    const keys = Array.from(seen)
    const existing = await this.prisma.setting.findMany({
      where: { key: { in: keys } },
      select: { key: true }
    })
    const existingKeys = new Set(existing.map((r) => r.key))
    const missing = keys.filter((k) => !existingKeys.has(k))
    if (missing.length > 0) {
      throw new NotFoundException(
        `settings not found, please create via migration first: ${missing.join(', ')}`
      )
    }

    return this.prisma.$transaction(async (tx) => {
      for (const u of updates) {
        await tx.setting.update({
          where: { key: u.key },
          data: { value: u.value as Prisma.InputJsonValue }
        })
      }
      return { count: updates.length }
    })
  }
}
