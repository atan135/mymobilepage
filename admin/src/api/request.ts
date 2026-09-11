import { ofetch } from 'ofetch'

/**
 * 通用请求实例（ofetch 封装）。
 *
 * 后端地址通过 vite proxy 转发：/api/* → http://localhost:3000/*
 * 开发期前端不需要 CORS 配置；生产期需要服务端允许 origin。
 */
export const request = ofetch.create({
  baseURL: '/api/admin',
  timeout: 10_000,
  onRequest({ options }) {
    const token = localStorage.getItem('admin-token')
    if (token) {
      const headers = new Headers(options.headers as HeadersInit | undefined)
      headers.set('Authorization', `Bearer ${token}`)
      options.headers = headers
    }
  },
  onResponseError({ response }) {
    if (response.status === 401) {
      localStorage.removeItem('admin-token')
      localStorage.removeItem('admin-user')
    }
  }
})