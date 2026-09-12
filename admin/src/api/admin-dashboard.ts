import { request } from './request'

export interface DashboardTopProduct {
  productId: number
  title: string
  cover: string
  sales: number
  gmv: number
}

export type DashboardPendingItemType = 'order' | 'refund'

export interface DashboardPendingItem {
  type: DashboardPendingItemType
  id: number
  refId: number
  title: string
  subtitle: string
  amount: number
  createdAt: string
  status: number
}

export interface DashboardLowStockProduct {
  id: number
  title: string
  cover: string
  stock: number
  threshold: number
}

export interface DashboardOverview {
  todayOrders: number
  todayGmv: number
  totalUsers: number
  pendingShipOrders: number
  pendingRefundReviews: number
  pendingRefunds: number
  topProducts: DashboardTopProduct[]
  pendingItems: DashboardPendingItem[]
  lowStockCount: number
  lowStockProducts: DashboardLowStockProduct[]
}

export interface SalesTrendPoint {
  date: string
  amount: number
  count: number
}

export function getDashboardOverview() {
  return request<DashboardOverview>('/dashboard/overview')
}

export function getSalesTrend(days = 7) {
  return request<SalesTrendPoint[]>('/dashboard/sales-trend', { query: { days } })
}