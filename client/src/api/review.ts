import { request } from './request'

export const REVIEW_STATUSES = [0, 1, 2] as const
export type ReviewStatus = (typeof REVIEW_STATUSES)[number]

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  0: '待审',
  1: '已通过',
  2: '已屏蔽'
}

export interface ReviewProductBrief {
  id: number
  title: string
  cover: string
}

export interface ReviewItem {
  id: number
  userId: number
  productId: number
  orderId: number | null
  rating: number
  content: string
  images: string[]
  status: ReviewStatus
  reply: string | null
  createdAt: string
  product?: ReviewProductBrief
}

export interface CanReviewItem {
  productId: number
  canReview: boolean
}

export interface CanReviewResponse {
  orderStatus: number
  items: CanReviewItem[]
}

export interface ReviewUserBrief {
  id: number
  username: string
  nickname: string | null
}

export interface PublicReviewItem extends ReviewItem {
  user?: ReviewUserBrief
}

export interface ProductReviewSummary {
  average: number
  total: number
}

export interface ProductReviewsResponse {
  summary: ProductReviewSummary
  list: PublicReviewItem[]
  page: number
  pageSize: number
  hasMore: boolean
}

export interface PaginatedReviews {
  list: ReviewItem[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export function createReview(payload: {
  orderId: number
  productId: number
  rating: number
  content: string
  images?: string[]
}) {
  return request<ReviewItem>('/reviews', { method: 'POST', body: payload })
}

export function listMyReviews(params: {
  status?: ReviewStatus
  page?: number
  pageSize?: number
} = {}) {
  return request<PaginatedReviews>('/reviews/my', { query: params })
}

export function listProductReviews(
  productId: number,
  params: { page?: number; pageSize?: number } = {}
) {
  return request<ProductReviewsResponse>(
    `/products/${productId}/reviews`,
    { query: params }
  )
}

export function getCanReview(orderId: number) {
  return request<CanReviewResponse>(`/reviews/can-review/${orderId}`)
}
