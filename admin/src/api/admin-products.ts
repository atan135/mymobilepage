import { request } from './request'
import type { PaginatedResult } from './types'

export interface AdminProduct {
  id: number
  title: string
  price: number | string
  originalPrice: number | string | null
  cover: string
  images: string[]
  description: string | null
  sales: number
  stock: number
  status: number
  categoryId: number
  category?: { id: number; name: string }
}

export interface AdminProductQuery {
  page?: number
  pageSize?: number
  keyword?: string
  categoryId?: number
  status?: number
  minPrice?: number
  maxPrice?: number
}

export function listAdminProducts(q: AdminProductQuery) {
  return request<PaginatedResult<AdminProduct>>('/products', { query: q })
}

export function getAdminProduct(id: number) {
  return request<AdminProduct>(`/products/${id}`)
}

export function createAdminProduct(data: Partial<AdminProduct>) {
  return request<AdminProduct>('/products', { method: 'POST', body: data })
}

export function updateAdminProduct(id: number, data: Partial<AdminProduct>) {
  return request<AdminProduct>(`/products/${id}`, { method: 'PATCH', body: data })
}

export function setAdminProductStatus(id: number, status: 0 | 1) {
  return request<AdminProduct>(`/products/${id}/status`, { method: 'PATCH', body: { status } })
}

export function adjustAdminProductStock(id: number, stock: number) {
  return request<AdminProduct>(`/products/${id}/stock`, { method: 'PATCH', body: { stock } })
}

export function deleteAdminProduct(id: number) {
  return request<{ ok: true }>(`/products/${id}`, { method: 'DELETE' })
}