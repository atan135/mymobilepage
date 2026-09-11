import { request } from './request'
import type { AdminCategory, PaginatedResult } from './types'

export function listAdminCategories() {
  return request<AdminCategory[]>('/categories')
}

export function getAdminCategory(id: number) {
  return request<AdminCategory>(`/categories/${id}`)
}

export function createAdminCategory(data: { name: string; icon?: string; sort?: number }) {
  return request<AdminCategory>('/categories', { method: 'POST', body: data })
}

export function updateAdminCategory(id: number, data: { name?: string; icon?: string; sort?: number }) {
  return request<AdminCategory>(`/categories/${id}`, { method: 'PATCH', body: data })
}

export function deleteAdminCategory(id: number) {
  return request<{ ok: true }>(`/categories/${id}`, { method: 'DELETE' })
}