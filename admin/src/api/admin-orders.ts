import { request } from './request'
import type { PaginatedResult } from './types'

/**
 * 订单状态枚举（与 server admin-orders 对齐）：
 *   0 PENDING    待付款
 *   1 PAID       待发货
 *   2 SHIPPED    已发货
 *   3 COMPLETED  已完成
 *   4 CANCELLED  已取消
 *   5 REFUNDED   已退款（markRefunded 后置位）
 */
export const ORDER_STATUSES = [0, 1, 2, 3, 4, 5] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  0: '待付款',
  1: '待发货',
  2: '已发货',
  3: '已完成',
  4: '已取消',
  5: '已退款'
}

export const ORDER_STATUS_TAG_TYPE: Record<OrderStatus, 'primary' | 'success' | 'warning' | 'info' | 'danger'> = {
  0: 'warning',
  1: 'primary',
  2: 'success',
  3: 'info',
  4: 'danger',
  5: 'info'
}

export interface OrderListItem {
  id: number
  orderNo: string
  userId: number
  user: { id: number; username: string; nickname: string | null }
  totalAmount: number
  status: OrderStatus
  itemCount: number
  receiver: unknown
  remark: string | null
  paidAt: string | null
  shippedAt: string | null
  completedAt: string | null
  cancelledAt: string | null
  shipCompany: string | null
  shipNo: string | null
  createdAt: string
  updatedAt: string
}

export interface OrderItem {
  id: number
  productId: number
  productTitle: string
  productCover: string
  price: number
  quantity: number
}

export interface OrderReceiver {
  name: string
  phone: string
  address: string
}



export interface OrderRefundInfo {
  id: number
  status: number
  amount: number
  reason: string
}

export interface OrderDetail extends Omit<OrderListItem, 'itemCount'> {
  items: OrderItem[]
  receiver: OrderReceiver
  refund: OrderRefundInfo | null
}

export interface OrderQuery {
  status?: OrderStatus
  keyword?: string
  page?: number
  pageSize?: number
}

export function listAdminOrders(q: OrderQuery) {
  return request<PaginatedResult<OrderListItem>>('/orders', { query: q })
}

export function getAdminOrder(id: number) {
  return request<OrderDetail>(`/orders/${id}`)
}

export function updateAdminOrderStatus(id: number, status: OrderStatus) {
  return request<OrderListItem>(`/orders/${id}/status`, {
    method: 'PATCH',
    body: { status }
  })
}

export function shipAdminOrder(id: number, data: { shipCompany: string; shipNo: string }) {
  return request<OrderListItem>(`/orders/${id}/ship`, {
    method: 'PATCH',
    body: data
  })
}

