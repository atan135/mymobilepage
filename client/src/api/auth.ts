import { request } from './request'

export interface LoginPayload {
  username: string
  password: string
}

export interface User {
  id: number
  username: string
  nickname: string | null
  avatar: string | null
  phone: string | null
}

export interface LoginResult {
  token: string
  user: User
}

export async function login(payload: LoginPayload): Promise<LoginResult> {
  return request<LoginResult>('/auth/login', { method: 'POST', body: payload })
}

export async function logout(): Promise<void> {
  await request('/auth/logout', { method: 'POST' })
}
