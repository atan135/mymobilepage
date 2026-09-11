export interface PaginatedResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface AdminCategory {
  id: number
  name: string
  icon: string | null
  sort: number
  _count?: { products: number }
}