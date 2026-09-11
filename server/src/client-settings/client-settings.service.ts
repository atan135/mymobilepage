import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

/**
 * 公共可读 setting group 白名单（以 DB 字段 group 为准）。
 */
const PUBLIC_GROUPS = ['site', 'customer_service']

@Injectable()
export class ClientSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 客户端公共读：
   * - 不传 keys → 返回所有白名单 group 下的全部设置（按 group 聚合）
   * - 传 keys → 只返回白名单 group 内存在的 key（不在白名单的静默忽略）
   *
   * 安全说明：白名单校验必须落到 DB 字段 group，不能仅用 key 字符串前缀，
   * 否则 admin 通过 bulkUpsert 写入 group=general 但 key 以 site_ 开头的条目
   * 后，匿名调用方可以读到任意 site_* key。
   */
  async list(keys?: string[]) {
    if (keys && keys.length > 0) {
      const filtered = keys.filter((k) =>
        PUBLIC_GROUPS.some((g) => k.startsWith(g + '_'))
      )
      if (filtered.length === 0) return { items: {} }
      const rows = await this.prisma.setting.findMany({
        where: {
          key: { in: filtered },
          group: { in: PUBLIC_GROUPS }
        }
      })
      return { items: this.toMap(rows) }
    }
    const rows = await this.prisma.setting.findMany({
      where: { group: { in: PUBLIC_GROUPS } },
      orderBy: [{ group: 'asc' }, { key: 'asc' }]
    })
    return { items: this.toMap(rows) }
  }

  private toMap(rows: Array<{ key: string; value: unknown }>): Record<string, unknown> {
    const out: Record<string, unknown> = {}
    for (const r of rows) out[r.key] = r.value
    return out
  }
}
