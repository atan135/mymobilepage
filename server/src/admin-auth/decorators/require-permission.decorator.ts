import { SetMetadata } from '@nestjs/common'
import type { AdminPermission } from '../types'

/**
 * 用法：@RequirePermission('user:create') 或 @RequirePermission(['user:create', 'user:edit'])
 * 空参数 @RequirePermission() 仅要求已登录（等同未加装饰器）。
 */
export const PERMISSIONS_KEY = 'admin:permissions'
export const RequirePermission = (...perms: AdminPermission[]) =>
  SetMetadata(PERMISSIONS_KEY, perms)