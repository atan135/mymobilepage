import { request } from './request'

export interface Banner {
  id: number
  image: string
  link: string | null
}

export function listBanners() {
  return request<Banner[]>('/banners')
}
