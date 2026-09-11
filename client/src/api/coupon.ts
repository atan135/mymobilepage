import { request } from './request'

export interface AvailableCoupon {
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
  remaining: number
  received: boolean
}

export interface UserCoupon {
  id: number
  couponId: number
  status: number
  source: number
  receivedAt: string
  usedAt: string | null
  expiresAt: string | null
  orderId: number | null
  coupon: {
    id: number
    name: string
    type: number
    threshold: number | null
    amount: number
    description: string | null
    validFrom: string
    validTo: string
  }
}

export interface PaginatedUserCoupons {
  list: UserCoupon[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface PreviewResult {
  originalAmount: number
  discountAmount: number
  totalAmount: number
  coupon: {
    id: number
    name: string
    type: number
    threshold: number | null
    amount: number
  } | null
}

export function listAvailableCoupons() {
  return request<AvailableCoupon[]>('/coupons/available')
}

export function claimCoupon(id: number) {
  return request<UserCoupon>(`/coupons/${id}/claim`, { method: 'POST' })
}

export function listMyCoupons(params: {
  status?: number
  page?: number
  pageSize?: number
} = {}) {
  return request<PaginatedUserCoupons>('/coupons/mine', { query: params })
}

export function previewCoupon(payload: {
  items: { productId: number; quantity: number }[]
  couponId?: number
}) {
  return request<PreviewResult>('/coupons/preview', {
    method: 'POST',
    body: payload
  })
}
