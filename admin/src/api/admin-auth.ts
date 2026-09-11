import { request } from './request'

export interface AdminLoginPayload {
  username: string
  password: string
}

export interface AdminUser {
  id: number
  username: string
  nickname: string | null
  avatar: string | null
  role: string
  permissions: string[]
}

export interface AdminLoginResult {
  token: string
  user: AdminUser
}

export async function adminLogin(payload: AdminLoginPayload): Promise<AdminLoginResult> {
  return request<AdminLoginResult>('/auth/login', {
    method: 'POST',
    body: payload
  })
}

export async function adminLogout(): Promise<void> {
  await request('/auth/logout', { method: 'POST' })
}

export async function adminProfile(): Promise<AdminUser> {
  return request<AdminUser>('/auth/profile')
}