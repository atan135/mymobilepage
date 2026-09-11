import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const categories = [
  { name: '手机数码', icon: 'https://picsum.photos/seed/c1/120/120', sort: 1 },
  { name: '服饰鞋包', icon: 'https://picsum.photos/seed/c2/120/120', sort: 2 },
  { name: '美妆个护', icon: 'https://picsum.photos/seed/c3/120/120', sort: 3 },
  { name: '家居生活', icon: 'https://picsum.photos/seed/c4/120/120', sort: 4 },
  { name: '食品生鲜', icon: 'https://picsum.photos/seed/c5/120/120', sort: 5 },
  { name: '运动户外', icon: 'https://picsum.photos/seed/c6/120/120', sort: 6 }
]

const cover = (seed: string) => `https://picsum.photos/seed/${seed}/400/400`

async function main(): Promise<void> {
  console.log('Cleaning existing data...')
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()

  console.log('Seeding categories...')
  const created = await Promise.all(
    categories.map((c) => prisma.category.create({ data: c }))
  )

  console.log(`Seeding products (24 across ${created.length} categories)...`)
  const products = []
  for (let i = 0; i < 24; i++) {
    const category = created[i % created.length]
    const seed = `p${i + 1}`
    products.push({
      title: `${category.name} · 热销单品 #${i + 1}`,
      price: Number((19.9 + i * 7.5).toFixed(2)),
      originalPrice: Number((39.9 + i * 9.3).toFixed(2)),
      cover: cover(seed),
      images: [cover(seed), cover(`p${i + 10}`), cover(`p${i + 20}`)],
      description:
        '这是一段商品介绍，描述商品的核心卖点、规格参数与适用场景，帮助你快速了解商品。',
      sales: 100 + i * 31,
      stock: 100 - i,
      categoryId: category.id
    })
  }
  await prisma.product.createMany({ data: products })

  console.log('Seeding banners...')
  await prisma.banner.createMany({
    data: [
      { image: 'https://picsum.photos/seed/banner1/750/300', link: '/home', sort: 1 },
      { image: 'https://picsum.photos/seed/banner2/750/300', link: '/home', sort: 2 },
      { image: 'https://picsum.photos/seed/banner3/750/300', link: '/home', sort: 3 }
    ]
  })

  const counts = {
    categories: await prisma.category.count(),
    products: await prisma.product.count(),
    banners: await prisma.banner.count()
  }
  console.log('Seed complete:', counts)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })