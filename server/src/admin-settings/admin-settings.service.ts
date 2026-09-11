import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import type { SettingUpdateItem } from './dto/setting.dto'

// settings group -> 所需权限码映射。
// service.bulkUpsert 在每条 update 前会用此映射校验调用方权限, 防止 operator 用 site 权限写 payment_*。
const GROUP_PERMISSION: Record<string, string> = {
  site: 'setting:site:edit',
  customer_service: 'setting:customer_service:edit',
  payment: 'setting:payment:edit',
  shipping: 'setting:shipping:edit',
  general: 'setting:general:edit'
}

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
  /**
   * 批量更新 settings。
   *
   * 安全说明 (Phase 2 git-review Medium #11):
   * - 入口权限仅要求持任意一个 setting:{group}:edit, 真正能否改某个 key 由本方法根据其 group 二次校验。
   * - callerPermissions 来自 controller 通过 req.user.permissions 传入；超管 '*' 直接放行。
   * - 不存在的 key 仍然拒绝 (要求 schema/migration 引入), 防止匿名读取漏洞复发 (见 Critical #2)。
   */
  async bulkUpsert(updates: SettingUpdateItem[], callerPermissions: string[] = []) {
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
      select: { key: true, group: true }
    })
    const existingMap = new Map(existing.map((r) => [r.key, r.group]))
    const missing = keys.filter((k) => !existingMap.has(k))
    if (missing.length > 0) {
      throw new NotFoundException(
        `settings not found, please create via migration first: ${missing.join(', ')}`
      )
    }

    // per-group 权限校验: 每个 key 的 group 必须对应一个 caller 持有的权限码。
    // 超管 '*' 直接放行。
    if (!callerPermissions.includes('*')) {
      const denied: string[] = []
      for (const key of keys) {
        const group = existingMap.get(key) ?? 'general'
        const required = GROUP_PERMISSION[group]
        if (!required) {
          denied.push(`${key} (unknown group ${group})`)
          continue
        }
        if (!callerPermissions.includes(required)) {
          denied.push(`${key} (需要权限 ${required})`)
        }
      }
      if (denied.length > 0) {
        throw new ForbiddenException(
          `以下设置项无权限修改: ${denied.join('; ')}`
        )
      }
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
