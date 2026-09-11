import { request } from './request'

/**
 * 公共读 setting。
 * 服务端白名单只允许 site_* / customer_service_* 前缀的 key。
 */
export function listPublicSettings(keys?: string[]) {
  return request<{ items: Record<string, unknown> }>('/client/settings', {
    query: keys && keys.length > 0 ? { keys: keys.join(',') } : {}
  })
}
