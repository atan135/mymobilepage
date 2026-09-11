import { request } from './request'
import type { PaginatedResult } from './types'

export interface AdminUser {
  id: number
  username: string
  nickname: string | null
  avatar: string | null
  phone: string | null
  status: number
  createdAt: string
  updatedAt: string
  _count?: { orders: number }
}

export interface AdminUserQuery {
  page?: number
  pageSize?: number
  keyword?: string
  status?: number
}

export function listAdminUsers(q: AdminUserQuery) {
  return request<PaginatedResult<AdminUser>>('/users', { query: q })
}

export function getAdminUser(id: number) {
  return request<AdminUser>(`/users/${id}`)
}

export function updateAdminUser(id: number, data: { nickname?: string; phone?: string; status?: number }) {
  return request<AdminUser>(`/users/${id}`, { method: 'PATCH', body: data })
}
