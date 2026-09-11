import { request } from './request'

export const REFUND_STATUSES = [0, 1, 2, 3] as const
export type RefundStatus = (typeof REFUND_STATUSES)[number]

export const REFUND_STATUS_LABELS: Record<RefundStatus, string> = {
  0: '待审',
  1: '已批准',
  2: '已拒绝',
  3: '已退款'
}

export const REFUND_STATUS_TAG_TYPE: Record<RefundStatus, 'warning' | 'success' | 'info' | 'danger'> = {
  0: 'warning',
  1: 'success',
  2: 'info',
  3: 'danger'
}

export interface AdminRefundOrder {
  id: number
  orderNo: string
  totalAmount: number
  status: number
  user?: {
    id: number
    username: string
    nickname: string | null
    phone: string | null
  } | null
}

export interface AdminRefundListItem {
  id: number
  orderId: number
  reason: string
  amount: number
  status: RefundStatus
  remark: string | null
  createdAt: string
  updatedAt: string
  order: AdminRefundOrder | null
}

export interface AdminRefundDetail extends AdminRefundListItem {
  order: (AdminRefundOrder & {
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
  list: AdminRefundListItem[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface RefundQuery {
  status?: RefundStatus
  keyword?: string
  page?: number
  pageSize?: number
}

export function listAdminRefunds(q: RefundQuery = {}) {
  return request<PaginatedRefunds>('/refunds', { query: q })
}

export function getAdminRefund(id: number) {
  return request<AdminRefundDetail>(`/refunds/${id}`)
}

export function approveAdminRefund(id: number) {
  return request<AdminRefundDetail>(`/refunds/${id}/approve`, {
    method: 'PATCH'
  })
}

export function rejectAdminRefund(id: number, remark: string) {
  return request<AdminRefundDetail>(`/refunds/${id}/reject`, {
    method: 'PATCH',
    body: { remark }
  })
}

export function markAdminRefunded(id: number) {
  return request<AdminRefundDetail>(`/refunds/${id}/refund`, {
    method: 'PATCH'
  })
}
