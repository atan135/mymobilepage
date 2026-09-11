import { request } from './request'

export interface Category {
  id: number
  name: string
  icon: string | null
  sort: number
}

export interface Product {
  id: number
  title: string
  price: number
  originalPrice?: number
  cover: string
  sales: number
  categoryId: number
  description: string
  images: string[]
  stock: number
  status: number
}

export interface PaginatedProducts {
  list: Product[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export function listCategories() {
  return request<Category[]>('/categories')
}

export function listProducts(params: {
  categoryId?: number
  page?: number
  pageSize?: number
  keyword?: string
} = {}) {
  return request<PaginatedProducts>('/products', { query: params })
}

export function getProduct(id: number) {
  return request<Product>(`/products/${id}`)
}
