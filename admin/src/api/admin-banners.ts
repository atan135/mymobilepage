import { request } from './request'

export interface AdminBanner {
  id: number
  image: string
  link: string | null
  sort: number
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export function listAdminBanners() {
  return request<AdminBanner[]>('/banners')
}

export function createAdminBanner(data: Partial<AdminBanner>) {
  return request<AdminBanner>('/banners', { method: 'POST', body: data })
}

export function updateAdminBanner(id: number, data: Partial<AdminBanner>) {
  return request<AdminBanner>(`/banners/${id}`, { method: 'PATCH', body: data })
}

export function deleteAdminBanner(id: number) {
  return request<{ ok: true }>(`/banners/${id}`, { method: 'DELETE' })
}