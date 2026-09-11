import { delay } from './request'
import {
  mockBanners,
  mockCategories,
  mockProducts,
  mockCart,
  type Category,
  type Product,
  type CartItem
} from '../mock/data'

export async function getBanners(): Promise<string[]> {
  await delay(120)
  return mockBanners
}

export async function getCategories(): Promise<Category[]> {
  await delay(120)
  return mockCategories
}

export async function getProducts(
  params: { categoryId?: number; page?: number; pageSize?: number } = {}
): Promise<{ list: Product[]; total: number; hasMore: boolean }> {
  await delay(200)
  const { categoryId, page = 1, pageSize = 10 } = params
  let list = mockProducts
  if (categoryId) list = list.filter((p) => p.categoryId === categoryId)
  const start = (page - 1) * pageSize
  const paged = list.slice(start, start + pageSize)
  return {
    list: paged,
    total: list.length,
    hasMore: start + pageSize < list.length
  }
}

export async function getProductById(id: number): Promise<Product> {
  await delay(150)
  const p = mockProducts.find((p) => p.id === id)
  if (!p) throw new Error('商品不存在')
  return p
}

export async function getCart(): Promise<CartItem[]> {
  await delay(120)
  return mockCart
}