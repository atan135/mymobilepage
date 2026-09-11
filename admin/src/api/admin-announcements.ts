import { request } from './request'

export interface AdminAnnouncement {
  id: number
  title: string
  content: string
  link: string | null
  status: number
  sort: number
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export function listAdminAnnouncements() {
  return request<AdminAnnouncement[]>('/announcements')
}

export function createAdminAnnouncement(data: Partial<AdminAnnouncement>) {
  return request<AdminAnnouncement>('/announcements', { method: 'POST', body: data })
}

export function updateAdminAnnouncement(id: number, data: Partial<AdminAnnouncement>) {
  return request<AdminAnnouncement>(`/announcements/${id}`, { method: 'PATCH', body: data })
}

export function publishAdminAnnouncement(id: number) {
  return request<AdminAnnouncement>(`/announcements/${id}/publish`, { method: 'PATCH' })
}

export function unpublishAdminAnnouncement(id: number) {
  return request<AdminAnnouncement>(`/announcements/${id}/unpublish`, { method: 'PATCH' })
}

export function deleteAdminAnnouncement(id: number) {
  return request<{ ok: true }>(`/announcements/${id}`, { method: 'DELETE' })
}