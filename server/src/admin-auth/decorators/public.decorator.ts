import { SetMetadata } from '@nestjs/common'

export const IS_PUBLIC_KEY = 'admin:isPublic'

/**
 * 标记一个路由不参与鉴权（最常用于 login / register）。
 * 放在 controller 或 method 上都生效。
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)