import { request } from './request'

export interface AdminCoupon {
  id: number
  name: string
  type: number
  threshold: number | null
  amount: number
  description: string | null
  validFrom: string
  validTo: string
  total: number
  perUserLimit: number
  status: number
  claimed: number
  createdAt: string
  updatedAt: string
}

export interface AdminCouponClaim {
  id: number
  userId: number
  user: { id: number; username: string; nickname: string | null; phone: string | null }
  status: number
  source: number
  receivedAt: string
  usedAt: string | null
  expiresAt: string | null
  orderId: number | null
}

export interface PaginatedCoupons {
  list: AdminCoupon[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface PaginatedClaims {
  list: AdminCouponClaim[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export function listAdminCoupons(params: {
  keyword?: string
  status?: number
  type?: number
  page?: number
  pageSize?: number
} = {}) {
  return request<PaginatedCoupons>('/coupons', { query: params })
}

export function getAdminCoupon(id: number) {
  return request<AdminCoupon>(`/coupons/${id}`)
}

export function createAdminCoupon(data: Partial<AdminCoupon> & { validFrom: string; validTo: string }) {
  return request<AdminCoupon>('/coupons', { method: 'POST', body: data })
}

export function updateAdminCoupon(id: number, data: Partial<AdminCoupon>) {
  return request<AdminCoupon>(`/coupons/${id}`, { method: 'PATCH', body: data })
}

export function updateAdminCouponStatus(id: number, status: number) {
  return request<AdminCoupon>(`/coupons/${id}/status`, {
    method: 'PATCH',
    body: { status }
  })
}

export function deleteAdminCoupon(id: number) {
  return request<{ ok: true }>(`/coupons/${id}`, { method: 'DELETE' })
}

export function listAdminCouponClaims(id: number, params: {
  status?: number
  source?: number
  page?: number
  pageSize?: number
} = {}) {
  return request<PaginatedClaims>(`/coupons/${id}/claims`, { query: params })
}

export function grantAdminCoupon(id: number, userIds: number[]) {
  return request<{ granted: number; skipped: number; remaining: number }>(
    `/coupons/${id}/grant`,
    { method: 'POST', body: { userIds } }
  )
}
