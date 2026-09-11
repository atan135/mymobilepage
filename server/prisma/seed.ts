import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

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

const SUPER_ADMIN_PERMISSIONS = ['*']

const ADMIN_PERMISSIONS = [
  'dashboard:view',
  'user:list', 'user:detail',
  'product:list', 'product:create', 'product:edit',
  'product:on_off', 'product:adjust_stock',
  'category:list', 'category:create', 'category:edit',
  'order:list', 'order:detail', 'order:ship',
  'banner:list', 'banner:create', 'banner:edit',
  'announcement:list', 'announcement:create', 'announcement:edit'
]

async function main(): Promise<void> {
  console.log('Cleaning transactional data (categories / products / banners / announcements / orders)...')
  await prisma.refundRequest.deleteMany()
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.announcement.deleteMany()
  await prisma.banner.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
  console.log('Cleaning admin users / roles...')
  await prisma.adminUser.deleteMany()
  await prisma.role.deleteMany()

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

  console.log('Seeding admin roles...')
  const superRole = await prisma.role.create({
    data: {
      name: '超级管理员',
      code: 'SUPER_ADMIN',
      description: '拥有所有权限',
      permissions: SUPER_ADMIN_PERMISSIONS
    }
  })
  const adminRole = await prisma.role.create({
    data: {
      name: '普通管理员',
      code: 'ADMIN',
      description: '日常运营权限（不含删除 / 角色分配等敏感操作）',
      permissions: ADMIN_PERMISSIONS
    }
  })

  console.log('Seeding admin users...')
  const superPwd = await bcrypt.hash('admin123', 10)
  await prisma.adminUser.create({
    data: {
      username: 'admin',
      passwordHash: superPwd,
      nickname: '超级管理员',
      roleId: superRole.id
    }
  })
  const adminPwd = await bcrypt.hash('admin123', 10)
  await prisma.adminUser.create({
    data: {
      username: 'operator',
      passwordHash: adminPwd,
      nickname: '运营',
      roleId: adminRole.id
    }
  })

  const counts = {
    categories: await prisma.category.count(),
    products: await prisma.product.count(),
    banners: await prisma.banner.count(),
    roles: await prisma.role.count(),
    adminUsers: await prisma.adminUser.count()
  }
  console.log('Seed complete:', counts)
  console.log('Admin login: username=admin / password=admin123  (SUPER_ADMIN)')
  console.log('Admin login: username=operator / password=admin123  (ADMIN)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })