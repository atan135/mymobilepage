export interface User {
  id: number
  username: string
  nickname: string
  avatar: string
  phone?: string
}

export interface Category {
  id: number
  name: string
  icon: string
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
}

export interface CartItem {
  productId: number
  product: Product
  quantity: number
  selected: boolean
}

export const mockUser: User = {
  id: 1,
  username: 'demo',
  nickname: '演示用户',
  avatar: 'https://picsum.photos/seed/avatar/200/200',
  phone: '138****0000'
}

export const mockCategories: Category[] = [
  { id: 1, name: '手机数码', icon: 'https://picsum.photos/seed/c1/120/120' },
  { id: 2, name: '服饰鞋包', icon: 'https://picsum.photos/seed/c2/120/120' },
  { id: 3, name: '美妆个护', icon: 'https://picsum.photos/seed/c3/120/120' },
  { id: 4, name: '家居生活', icon: 'https://picsum.photos/seed/c4/120/120' },
  { id: 5, name: '食品生鲜', icon: 'https://picsum.photos/seed/c5/120/120' },
  { id: 6, name: '运动户外', icon: 'https://picsum.photos/seed/c6/120/120' }
]

const cover = (seed: number | string, w = 400, h = 400) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`

export const mockProducts: Product[] = Array.from({ length: 24 }).map((_, i) => ({
  id: i + 1,
  title: `${mockCategories[i % 6].name} · 热销单品 #${i + 1}`,
  price: Number((19.9 + i * 7.5).toFixed(2)),
  originalPrice: Number((39.9 + i * 9.3).toFixed(2)),
  cover: cover(`p${i + 1}`),
  sales: 100 + i * 31,
  categoryId: (i % 6) + 1,
  description:
    '这是一段商品介绍，描述商品的核心卖点、规格参数与适用场景，帮助你快速了解商品。',
  images: [cover(`p${i + 1}`), cover(`p${i + 10}`), cover(`p${i + 20}`)],
  stock: 100 - i
}))

export const mockBanners: string[] = [
  'https://picsum.photos/seed/banner1/750/300',
  'https://picsum.photos/seed/banner2/750/300',
  'https://picsum.photos/seed/banner3/750/300'
]

export const mockCart: CartItem[] = [
  {
    productId: 1,
    product: mockProducts[0],
    quantity: 1,
    selected: true
  },
  {
    productId: 5,
    product: mockProducts[4],
    quantity: 2,
    selected: true
  }
]