import { request } from './request'
import type { InventoryType } from './admin-inventory'
import type { OrderStatus } from './admin-orders'

export interface ExportOrdersParams {
  status?: OrderStatus
  keyword?: string
  dateFrom?: string
  dateTo?: string
  // 兼容下游 `download(path, params, ...)` 的 `Record<string, unknown>` 形参
  [key: string]: unknown
}

export interface ExportProductsParams {
  categoryId?: number
  status?: 0 | 1
  keyword?: string
  [key: string]: unknown
}

export interface ExportInventoryLogsParams {
  productId?: number
  type?: InventoryType
  keyword?: string
  dateFrom?: string
  dateTo?: string
  [key: string]: unknown
}

/**
 * 触发浏览器下载返回的 Blob。
 * 服务端通过 Content-Disposition: attachment 给了文件名，优先用；否则按 fallback。
 */
function triggerDownload(blob: Blob, fallback: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fallback
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function pickFilename(headers: Headers, fallback: string): string {
  // ofetch 的 headers 在不同平台是 Headers 对象或普通对象
  let disp: string | null = null
  if (typeof (headers as Headers).get === 'function') {
    disp = (headers as Headers).get('content-disposition')
  } else {
    disp = (headers as unknown as Record<string, string>)['content-disposition'] ?? null
  }
  if (!disp) return fallback
  const m = disp.match(/filename="?([^";]+)"?/)
  return m && m[1] ? m[1] : fallback
}

async function download(path: string, params: Record<string, unknown>, fallback: string) {
  // 过滤 undefined / 空字符串，避免后端 validator 把 "" 当作合法值（dateFrom 等）
  const query: Record<string, string | number> = {}
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue
    query[k] = v as string | number
  }
  const res = await request.raw(path, {
    query,
    responseType: 'blob'
  })
  const blob = res._data as Blob
  const filename = pickFilename(res.headers, fallback)
  triggerDownload(blob, filename)
}

export async function exportOrders(params: ExportOrdersParams = {}) {
  await download('/exports/orders', params, 'orders.xlsx')
}

export async function exportProducts(params: ExportProductsParams = {}) {
  await download('/exports/products', params, 'products.xlsx')
}

export async function exportInventoryLogs(params: ExportInventoryLogsParams = {}) {
  await download('/exports/inventory-logs', params, 'inventory-logs.xlsx')
}
