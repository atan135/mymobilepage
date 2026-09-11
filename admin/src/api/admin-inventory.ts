import { request } from './request'

export const INVENTORY_TYPES = [1, 2, 3, 4, 5] as const
export type InventoryType = (typeof INVENTORY_TYPES)[number]

export const INVENTORY_TYPE_LABELS: Record<InventoryType, string> = {
  1: '入库',
  2: '出库',
  3: '调整',
  4: '退款入库',
  5: '取消退库'
}

export const INVENTORY_TYPE_TAG_TYPE: Record<InventoryType, 'success' | 'warning' | 'info' | 'primary'> = {
  1: 'success',
  2: 'warning',
  3: 'info',
  4: 'primary',
  5: 'primary'
}

export interface AdminInventoryOperator {
  id: number
  username: string
  nickname: string | null
}

export interface AdminInventoryProduct {
  id: number
  title: string
  cover: string
}

export interface AdminInventoryLogItem {
  id: number
  productId: number
  type: InventoryType
  quantity: number
  reason: string | null
  beforeStock: number
  afterStock: number
  operatorId: number | null
  createdAt: string
  product: AdminInventoryProduct
  operator: AdminInventoryOperator | null
}

export interface PaginatedInventoryLogs {
  list: AdminInventoryLogItem[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface InventoryLogQuery {
  productId?: number
  type?: InventoryType
  keyword?: string
  page?: number
  pageSize?: number
}

export interface AdminInventoryWarning {
  id: number
  title: string
  cover: string
  stock: number
  threshold: number
  gap: number
  status: number
  categoryId: number
}

export function listAdminInventoryLogs(q: InventoryLogQuery = {}) {
  return request<PaginatedInventoryLogs>('/inventory/logs', { query: q })
}

export function listAdminInventoryWarnings() {
  return request<AdminInventoryWarning[]>('/inventory/warnings')
}

export function setAdminProductThreshold(id: number, threshold: number) {
  const path = '/inventory/products/' + id + '/threshold'
  return request<{ id: number; threshold: number }>(path, {
    method: 'PATCH',
    body: { threshold }
  })
}
