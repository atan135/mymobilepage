import { ofetch } from 'ofetch'

/**
 * 通用请求实例（ofetch 封装）。
 *
 * 当前阶段所有接口走本地 mock，未真正发起网络请求。
 * 等后端（NestJS）就绪后，只需把 mock 函数替换为真实调用即可：
 *   export const getProducts = (params) => request<Product[]>('/products', { query: params })
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

/** 模拟网络延迟，方便观察 loading 态 */
export const delay = (ms = 300) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))