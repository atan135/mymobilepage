import { request } from './request'

export const REFUND_STATUSES = [0, 1, 2, 3] as const
export type RefundStatus = (typeof REFUND_STATUSES)[number]

export const REFUND_STATUS_LABELS: Record<RefundStatus, string> = {
  0: '待审',
  1: '已批准',
  2: '已拒绝',
  3: '已退款'
}

export interface RefundOrderSummary {
  id: number
  orderNo: string
  totalAmount: number
  status: number
}

export interface RefundRequest {
  id: number
  orderId: number
  reason: string
  amount: number
  status: RefundStatus
  remark: string | null
  createdAt: string
  updatedAt: string
  order: RefundOrderSummary | null
}

export interface RefundDetail extends RefundRequest {
  order: (RefundOrderSummary & {
    items: Array<{
      id: number
      productId: number
      productTitle: string
      productCover: string
      price: number
      quantity: number
    }>
    coupon: {
      userCouponId: number
      couponId: number
      name: string
      type: number
      amount: number
    } | null
  }) | null
}

export interface PaginatedRefunds {
  list: RefundRequest[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export function createRefund(payload: { orderId: number; reason: string; amount: number }) {
  return request<RefundRequest>('/refunds', { method: 'POST', body: payload })
}

export function listMyRefunds(params: { status?: RefundStatus; page?: number; pageSize?: number } = {}) {
  return request<PaginatedRefunds>('/refunds/my', { query: params })
}

export function getMyRefund(id: number) {
  return request<RefundDetail>(`/refunds/${id}`)
}
