import { request } from './request'

export interface DashboardTopProduct {
  productId: number
  title: string
  cover: string
  sales: number
  gmv: number
}

export interface DashboardPendingOrder {
  id: number
  orderNo: string
  totalAmount: number
  createdAt: string
  user: { username: string; nickname: string | null }
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
  pendingOrders: number
  topProducts: DashboardTopProduct[]
  pendingOrderList: DashboardPendingOrder[]
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
