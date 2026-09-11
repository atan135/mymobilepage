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


