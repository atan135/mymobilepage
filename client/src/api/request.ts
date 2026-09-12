import { ofetch } from 'ofetch'

/**
 * 通用请求实例（ofetch 封装）。
 * baseURL = '/api'，开发期通过 Vite Proxy 转发到后端 :3000。
 */
export const request = ofetch.create({
  baseURL: '/api',
  timeout: 10_000,
  onRequest({ options }) {
    const token = localStorage.getItem('token')
    if (token) {
      const headers = new Headers(options.headers as HeadersInit | undefined)
      headers.set('Authorization', `Bearer ${token}`)
      options.headers = headers
    }
  },
  onResponseError({ response }) {
    if (response.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
  }
})

/**
 * 从 ofetch 的 FetchError 中提取可读 message，给 toast / 表单提示用。
 *
 * 背景：ofetch 抛出的 FetchError.message 是「[METHOD] `url`: 400 Bad Request」一长串，
 * 直接 showToast 给用户看不懂。NestJS 的 4xx 响应 body 形如
 *   { statusCode, message, error, path, timestamp }
 * 真正的中文错误在 .data.message 里。
 *
 * 优先级：data.message → Error.message → fallback。
 */
export function errorMessage(e: unknown, fallback: string): string {
  const anyE = e as { data?: { message?: unknown }; message?: unknown }
  const fromData = anyE?.data?.message
  if (typeof fromData === 'string' && fromData.trim()) return fromData
  if (e instanceof Error && e.message) return e.message
  return fallback
}
