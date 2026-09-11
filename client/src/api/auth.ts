import { delay } from './request'
import { mockUser, type User } from '../mock/data'

export interface LoginPayload {
  username: string
  password: string
}

export interface LoginResult {
  token: string
  user: User
}

/**
 * 模拟登录：用户名 / 密码任意非空即视为成功。
 * 等后端就绪后改为：
 *   return request<LoginResult>('/auth/login', { method: 'POST', body: payload })
 */
export async function login(payload: LoginPayload): Promise<LoginResult> {
  await delay(400)
  if (!payload.username?.trim() || !payload.password?.trim()) {
    throw new Error('用户名或密码不能为空')
  }
  return {
    token: 'mock-token-' + Date.now(),
    user: { ...mockUser, nickname: payload.username.trim() }
  }
}

export async function fetchProfile(): Promise<User | null> {
  await delay(150)
  const cached = localStorage.getItem('user')
  return cached ? (JSON.parse(cached) as User) : null
}

export async function logout(): Promise<void> {
  await delay(120)
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}