import { request } from './request'

export interface AdminAuditLogAdmin {
  id: number
  username: string
  nickname: string | null
}

export interface AdminAuditLogItem {
  id: number
  adminId: number | null
  action: string
  resource: string
  resourceId: number | null
  payload: Record<string, unknown> | null
  ip: string | null
  userAgent: string | null
  createdAt: string
  admin: AdminAuditLogAdmin | null
}

export interface PaginatedAuditLogs {
  list: AdminAuditLogItem[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface AuditLogQuery {
  adminId?: number
  resource?: string
  action?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
}

export function listAdminAuditLogs(q: AuditLogQuery = {}) {
  return request<PaginatedAuditLogs>('/audit-logs', { query: q })
}

