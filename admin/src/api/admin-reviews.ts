import { request } from './request'

export const REVIEW_STATUSES = [0, 1, 2] as const
export type ReviewStatus = (typeof REVIEW_STATUSES)[number]

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  0: '待审',
  1: '已通过',
  2: '已屏蔽'
}

export const REVIEW_STATUS_TAG_TYPE: Record<ReviewStatus, 'warning' | 'success' | 'info' | 'danger'> = {
  0: 'warning',
  1: 'success',
  2: 'info'
}

export const REVIEW_RATINGS = [1, 2, 3, 4, 5] as const
export type ReviewRating = (typeof REVIEW_RATINGS)[number]

export interface AdminReviewUser {
  id: number
  username: string
  nickname: string | null
  phone?: string | null
}

export interface AdminReviewProduct {
  id: number
  title: string
  cover: string
}

export interface AdminReviewListItem {
  id: number
  productId: number
  userId: number
  rating: ReviewRating
  content: string
  images: string[]
  status: ReviewStatus
  reply: string | null
  createdAt: string
  updatedAt: string
  product: AdminReviewProduct
  user: AdminReviewUser
}

export type AdminReviewDetail = AdminReviewListItem

export interface PaginatedReviews {
  list: AdminReviewListItem[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface ReviewQuery {
  status?: ReviewStatus
  rating?: ReviewRating
  keyword?: string
  page?: number
  pageSize?: number
}

export function listAdminReviews(q: ReviewQuery = {}) {
  return request<PaginatedReviews>('/reviews', { query: q })
}

export function getAdminReview(id: number) {
  return request<AdminReviewDetail>(`/reviews/${id}`)
}

export function approveAdminReview(id: number) {
  return request<AdminReviewDetail>(`/reviews/${id}/approve`, {
    method: 'PATCH'
  })
}

export function blockAdminReview(id: number) {
  return request<AdminReviewDetail>(`/reviews/${id}/block`, {
    method: 'PATCH'
  })
}

export function replyAdminReview(id: number, reply: string) {
  return request<AdminReviewDetail>(`/reviews/${id}/reply`, {
    method: 'PATCH',
    body: { reply }
  })
}