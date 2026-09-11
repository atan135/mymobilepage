import { request } from './request'

export interface CartItemPayload {
  productId: number
  quantity: number
}

export interface ReceiverPayload {
  name: string
  phone: string
  address: string
}

export interface CreateOrderPayload {
  items: CartItemPayload[]
  receiver: ReceiverPayload
  remark?: string
  /**
   * 可选：使用的 UserCoupon.id（不是 coupons.id）。
   * 服务端会校验归属 + 未使用 + 未过期，并按 coupon.type 计算折扣。
   */
  couponId?: number
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

export interface OrderCouponInfo {
  userCouponId: number
  couponId: number
  name: string
  type: number
  amount: number
}

export interface OrderListItem {
  id: number
  orderNo: string
  userId: number
  totalAmount: number
  originalAmount: number | null
  discountAmount: number | null
  status: number
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

export interface OrderDetail extends Omit<OrderListItem, 'itemCount'> {
  items: OrderItem[]
  receiver: OrderReceiver
  coupon: OrderCouponInfo | null
}

export interface PaginatedOrders {
  list: OrderListItem[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export function createOrder(payload: CreateOrderPayload) {
  return request<OrderDetail>('/orders', { method: 'POST', body: payload })
}

export function listMyOrders(params: { status?: number; page?: number; pageSize?: number } = {}) {
  return request<PaginatedOrders>('/orders/my', { query: params })
}

export function getOrder(id: number) {
  return request<OrderDetail>(`/orders/${id}`)
}

export function cancelOrder(id: number) {
  return request<OrderDetail>(`/orders/${id}/cancel`, { method: 'PATCH' })
}

export function confirmReceipt(id: number) {
  return request<OrderDetail>(`/orders/${id}/confirm-receipt`, { method: 'POST' })
}
