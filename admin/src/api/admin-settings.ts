import { request } from './request'

export const SETTING_GROUPS = ['site', 'customer_service', 'payment', 'shipping'] as const
export type SettingGroup = (typeof SETTING_GROUPS)[number]

export const SETTING_GROUP_LABELS: Record<SettingGroup, string> = {
  site: '站点信息',
  customer_service: '客服',
  payment: '支付',
  shipping: '运费'
}

export interface AdminSetting {
  id: number
  key: string
  value: unknown
  group: string
  description: string | null
  updatedAt: string
}

export interface AdminSettingsListResponse {
  list: AdminSetting[]
}

export function listAdminSettings() {
  return request<AdminSettingsListResponse>('/settings')
}

export function bulkUpdateAdminSettings(updates: Array<{ key: string; value: unknown }>) {
  return request<{ count: number }>('/settings', {
    method: 'PUT',
    body: { updates }
  })
}

