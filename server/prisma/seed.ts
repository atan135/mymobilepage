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
  'announcement:list', 'announcement:create', 'announcement:edit',
  'coupon:list', 'coupon:create', 'coupon:edit',
  'coupon:on_off', 'coupon:delete', 'coupon:grant',
  'refund:list', 'refund:detail', 'refund:approve',
  'refund:reject', 'refund:refund',
  'inventory:list', 'inventory:warning',
  'export:orders', 'export:products', 'export:inventory_logs',
  'audit:view',
  'review:list', 'review:detail', 'review:approve',
  'review:block', 'review:reply',
  // settings 按 group 拆分 (Phase 2 git-review Medium #11):
  // 仅 site / customer_service 两个 group 的编辑权, payment / shipping / general 留给 super admin
  'setting:list',
  'setting:site:edit',
  'setting:customer_service:edit'
]

const seedUsers = [
  { username: 'alice', nickname: '小爱', phone: '13800000001' },
  { username: 'bob', nickname: '阿波', phone: '13800000002' },
  { username: 'carol', nickname: '小卡', phone: '13800000003' },
  { username: 'dave', nickname: '老戴', phone: '13800000004' },
  { username: 'eve', nickname: '伊芙', phone: '13800000005' }
]

async function main(): Promise<void> {
  console.log('Cleaning transactional data (categories / products / banners / announcements / orders)...')
  await prisma.refundRequest.deleteMany()
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.announcement.deleteMany()
  await prisma.banner.deleteMany()
  await prisma.review.deleteMany()
  await prisma.inventoryLog.deleteMany()
  await prisma.userCoupon.deleteMany()
  await prisma.coupon.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()

  console.log('Cleaning users...')
  await prisma.user.deleteMany()

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
    // 演示预警：最后 3 个商品（i>=21）设高阈值，制造低库存样本
    const isWarningSample = i >= 21
    products.push({
      title: `${category.name} · 热销单品 #${i + 1}`,
      price: Number((19.9 + i * 7.5).toFixed(2)),
      originalPrice: Number((39.9 + i * 9.3).toFixed(2)),
      cover: cover(seed),
      images: [cover(seed), cover(`p${i + 10}`), cover(`p${i + 20}`)],
      description: '这是一段商品介绍，描述商品的核心卖点、规格参数与适用场景，帮助你快速了解商品。',
      sales: 100 + i * 31,
      stock: 100 - i,
      threshold: isWarningSample ? 90 : 10,
      categoryId: category.id
    })
  }
  const createdProducts = await Promise.all(
    products.map((p) => prisma.product.create({ data: p }))
  )

  console.log(`Seeding users (${seedUsers.length})...`)
  const userPwd = await bcrypt.hash('user123', 10)
  const createdUsers = await Promise.all(
    seedUsers.map((u) =>
      prisma.user.create({ data: { ...u, passwordHash: userPwd } })
    )
  )

  console.log('Seeding banners...')
  await prisma.banner.createMany({
    data: [
      { image: 'https://picsum.photos/seed/banner1/750/300', link: '/home', sort: 1 },
      { image: 'https://picsum.photos/seed/banner2/750/300', link: '/home', sort: 2 },
      { image: 'https://picsum.photos/seed/banner3/750/300', link: '/home', sort: 3 }
    ]
  })

  const now = Date.now()
  const day = 24 * 60 * 60 * 1000

  console.log('Seeding coupons (3 张: 无门槛/满减/折扣, status=1, 30 天内有效)...')
  const validFrom = new Date(now - 7 * day)
  const validTo = new Date(now + 30 * day)
  const couponSeeds = [
    {
      id: 101,
      name: '新人立减券',
      type: 3,
      threshold: null,
      amount: 10,
      description: '新人专享，下单立减 10 元',
      validFrom,
      validTo,
      total: 100,
      perUserLimit: 1,
      status: 1
    },
    {
      id: 102,
      name: '满 99 减 20',
      type: 1,
      threshold: 99,
      amount: 20,
      description: '满 99 元可用，立减 20 元',
      validFrom,
      validTo,
      total: 200,
      perUserLimit: 2,
      status: 1
    },
    {
      id: 103,
      name: '满 200 打 85 折',
      type: 2,
      threshold: 200,
      amount: 85,
      description: '满 200 元享 85 折优惠',
      validFrom,
      validTo,
      total: 50,
      perUserLimit: 1,
      status: 1
    }
  ]
  await prisma.coupon.createMany({ data: couponSeeds })
  console.log(`  -> inserted ${couponSeeds.length} coupons`)

  console.log('Seeding user_coupons (alice/bob/carol 领 101 + alice 已用 102 + dave 已过期 102)...')
  await prisma.userCoupon.createMany({
    data: [
      { userId: createdUsers[0].id, couponId: 101, status: 0, source: 1, expiresAt: validTo },
      { userId: createdUsers[1].id, couponId: 101, status: 0, source: 1, expiresAt: validTo },
      { userId: createdUsers[2].id, couponId: 101, status: 0, source: 1, expiresAt: validTo },
      { userId: createdUsers[0].id, couponId: 102, status: 1, source: 0, usedAt: new Date(now - 2 * day), expiresAt: validTo },
      { userId: createdUsers[3].id, couponId: 102, status: 0, source: 0, expiresAt: new Date(now - 1 * day) }
    ]
  })
  console.log('  -> inserted 5 user_coupons')

  console.log('Seeding orders (10 spread across statuses + dates)...')
  const orderTemplates = [
    { dAgo: 0, status: 1, qty: 2, items: [0, 3] }, // 今日 已付款
    { dAgo: 0, status: 2, qty: 1, items: [1] },    // 今日 已发货
    { dAgo: 0, status: 3, qty: 1, items: [5] },    // 今日 已完成
    { dAgo: 0, status: 0, qty: 1, items: [7] },    // 今日 待付款（KPI 待处理订单）
    { dAgo: 0, status: 0, qty: 2, items: [10, 11] }, // 今日 待付款
    { dAgo: 1, status: 3, qty: 1, items: [2] },    // 昨日 已完成
    { dAgo: 2, status: 3, qty: 2, items: [4, 8] }, // 2 天前
    { dAgo: 4, status: 1, qty: 1, items: [6] },    // 4 天前
    { dAgo: 6, status: 3, qty: 1, items: [9] },    // 6 天前
    { dAgo: 8, status: 3, qty: 2, items: [12, 14] } // 8 天前
  ]
  for (let i = 0; i < orderTemplates.length; i++) {
    const t = orderTemplates[i]
    const user = createdUsers[i % createdUsers.length]
    const orderNo = `${Date.now().toString(36)}${(i + 1).toString().padStart(3, '0')}`.toUpperCase()
    const createdAt = new Date(now - t.dAgo * day - 60 * 60 * 1000)
    const items = t.items.map((idx) => {
      const p = createdProducts[idx % createdProducts.length]
      return {
        productId: p.id,
        productTitle: p.title,
        productCover: p.cover,
        price: Number(p.price),
        quantity: 1
      }
    })
    const total = items.reduce((s, it) => s + it.price * it.quantity, 0)
    const order = await prisma.order.create({
      data: {
        orderNo,
        userId: user.id,
        totalAmount: Number(total.toFixed(2)),
        status: t.status,
        receiver: {
          name: user.nickname ?? user.username,
          phone: user.phone ?? '',
          address: '上海市浦东新区张江高科技园区 demo 街 1 号'
        },
        remark: t.status === 0 ? '请尽快发货' : null,
        createdAt,
        updatedAt: createdAt,
        paidAt: t.status >= 1 ? new Date(createdAt.getTime() + 60 * 60 * 1000) : null,
        shippedAt: t.status >= 2 ? new Date(createdAt.getTime() + 2 * 60 * 60 * 1000) : null,
        completedAt: t.status === 3 ? new Date(createdAt.getTime() + 3 * 24 * 60 * 60 * 1000) : null,
        shipCompany: t.status >= 2 ? '顺丰速运' : null,
        shipNo: t.status >= 2 ? `SF${1000000 + i}` : null,
        items: { create: items }
      }
    })
    // 自增销量
    for (const it of items) {
      await prisma.product.update({
        where: { id: it.productId },
        data: { sales: { increment: it.quantity } }
      })
    }
    void order
  }

  console.log('Seeding reviews...')
  const reviewTemplates = [
    { userIdx: 0, productIdx: 0, rating: 5, content: '质感很棒，物流也快，下次还会回购！', images: [], status: 1, reply: '感谢您的支持，欢迎下次光临～' },
    { userIdx: 1, productIdx: 1, rating: 4, content: '整体不错，包装也挺精致的，性价比可以。', images: ['https://picsum.photos/seed/r1/300/300'], status: 1, reply: null },
    { userIdx: 2, productIdx: 2, rating: 5, content: '比想象中还好，强烈推荐给朋友们。', images: ['https://picsum.photos/seed/r2/300/300', 'https://picsum.photos/seed/r3/300/300'], status: 1, reply: '谢谢认可，我们会继续努力！' },
    { userIdx: 3, productIdx: 4, rating: 3, content: '中规中矩，价格再便宜点就更好了。', images: [], status: 1, reply: null },
    { userIdx: 4, productIdx: 6, rating: 4, content: '客服态度很好，发货也及时。', images: [], status: 1, reply: '感谢您的好评，期待您的下一次光临。' },
    { userIdx: 0, productIdx: 8, rating: 2, content: '一般般，材质感觉不太对。', images: [], status: 1, reply: null },
    { userIdx: 1, productIdx: 3, rating: 3, content: '等了很久才发货，体验一般。', images: [], status: 0, reply: null },
    { userIdx: 2, productIdx: 10, rating: 4, content: '不错，家人也挺喜欢。', images: [], status: 0, reply: null },
    { userIdx: 3, productIdx: 12, rating: 5, content: '回购第二次了，质量一如既往地稳定。', images: [], status: 0, reply: null },
    { userIdx: 4, productIdx: 15, rating: 1, content: '垃圾商品，跟图片完全不一样。', images: [], status: 2, reply: null },
    { userIdx: 0, productIdx: 18, rating: 1, content: '差评，差到无法形容。', images: [], status: 2, reply: null }
  ]
  let reviewCount = 0
  for (const t of reviewTemplates) {
    await prisma.review.create({
      data: {
        userId: createdUsers[t.userIdx].id,
        productId: createdProducts[t.productIdx].id,
        rating: t.rating,
        content: t.content,
        images: t.images,
        status: t.status,
        reply: t.reply
      }
    })
    reviewCount++
  }
  console.log(`  -> inserted ${reviewCount} reviews`)
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
  const adminSuper = await prisma.adminUser.create({
    data: {
      username: 'admin',
      passwordHash: superPwd,
      nickname: '超级管理员',
      roleId: superRole.id
    }
  })
  const adminPwd = await bcrypt.hash('admin123', 10)
  const adminOperator = await prisma.adminUser.create({
    data: {
      username: 'operator',
      passwordHash: adminPwd,
      nickname: '运营',
      roleId: adminRole.id
    }
  })

  console.log('Seeding audit logs...')
  const now2 = Date.now()
  const minute = 60 * 1000
  const auditTemplates: Array<{
    minutesAgo: number
    adminId: number
    action: string
    resource: string
    resourceId: number | null
    payload: Record<string, unknown> | null
    ip: string
  }> = [
    { minutesAgo: 5, adminId: adminSuper.id, action: 'login', resource: 'auth', resourceId: null, payload: { username: 'admin' }, ip: '127.0.0.1' },
    { minutesAgo: 7, adminId: adminOperator.id, action: 'login', resource: 'auth', resourceId: null, payload: { username: 'operator' }, ip: '127.0.0.1' },
    { minutesAgo: 12, adminId: adminOperator.id, action: 'create', resource: 'coupons', resourceId: 101, payload: { name: '新人立减券', type: 3, amount: 10 }, ip: '127.0.0.1' },
    { minutesAgo: 18, adminId: adminOperator.id, action: 'update', resource: 'coupons', resourceId: 101, payload: { description: '新人专享，下单立减 10 元' }, ip: '127.0.0.1' },
    { minutesAgo: 25, adminId: adminOperator.id, action: 'create', resource: 'banners', resourceId: 5, payload: { image: 'https://picsum.photos/seed/banner-x/750/300', link: '/home' }, ip: '127.0.0.1' },
    { minutesAgo: 30, adminId: adminSuper.id, action: 'update', resource: 'products', resourceId: 110, payload: { stock: 80 }, ip: '127.0.0.1' },
    { minutesAgo: 42, adminId: adminOperator.id, action: 'approve', resource: 'refunds', resourceId: 1, payload: null, ip: '127.0.0.1' },
    { minutesAgo: 55, adminId: adminOperator.id, action: 'refund', resource: 'refunds', resourceId: 1, payload: null, ip: '127.0.0.1' },
    { minutesAgo: 70, adminId: adminOperator.id, action: 'approve', resource: 'reviews', resourceId: 30, payload: null, ip: '127.0.0.1' },
    { minutesAgo: 90, adminId: adminOperator.id, action: 'block', resource: 'reviews', resourceId: 31, payload: null, ip: '127.0.0.1' },
    { minutesAgo: 120, adminId: adminSuper.id, action: 'update', resource: 'products', resourceId: 120, payload: { threshold: 80 }, ip: '127.0.0.1' },
    { minutesAgo: 180, adminId: adminOperator.id, action: 'grant', resource: 'coupons', resourceId: 101, payload: { userIds: [1, 2, 3] }, ip: '127.0.0.1' },
    { minutesAgo: 240, adminId: adminOperator.id, action: 'ship', resource: 'orders', resourceId: 42, payload: { shipCompany: '顺丰速运', shipNo: 'SF1000042' }, ip: '127.0.0.1' },
    { minutesAgo: 360, adminId: adminOperator.id, action: 'delete', resource: 'announcements', resourceId: 8, payload: null, ip: '127.0.0.1' }
  ]
  let auditCount = 0
  for (const t of auditTemplates) {
    await prisma.auditLog.create({
      data: {
        adminId: t.adminId,
        action: t.action,
        resource: t.resource,
        resourceId: t.resourceId,
        payload: t.payload as never,
        ip: t.ip,
        userAgent: 'Mozilla/5.0 (demo seed)',
        createdAt: new Date(now2 - t.minutesAgo * minute)
      }
    })
    auditCount++
  }
  console.log(`  -> inserted ${auditCount} audit logs`)
    console.log('Seeding settings...')
  const settings = [
    { key: 'site_name', value: '我的小店', group: 'site', description: '站点名称（客户端首页展示）' },
    { key: 'site_logo', value: 'https://picsum.photos/seed/logo/120/120', group: 'site', description: '站点 Logo URL' },
    { key: 'site_description', value: '一家专注于生活好物的精选商城', group: 'site', description: '站点描述（SEO 用）' },
    { key: 'icp', value: '', group: 'site', description: 'ICP 备案号' },
    { key: 'customer_service_phone', value: '400-123-4567', group: 'customer_service', description: '客服电话' },
    { key: 'customer_service_wechat', value: 'my_shop_cs', group: 'customer_service', description: '客服微信号' },
    { key: 'working_hours', value: '9:00-21:00', group: 'customer_service', description: '客服工作时间' },
    { key: 'payment_methods', value: ['wechat', 'alipay'], group: 'payment', description: '支持的支付方式' },
    { key: 'min_order_amount', value: 0, group: 'payment', description: '起送金额（元）' },
    { key: 'free_shipping_threshold', value: 99, group: 'shipping', description: '免运费门槛（元）' },
    { key: 'default_shipping_fee', value: 10, group: 'shipping', description: '默认运费（元）' },
    { key: 'supported_regions', value: ['中国大陆'], group: 'shipping', description: '支持的配送地区' }
  ]
  for (const s2 of settings) {
    await prisma.setting.upsert({
      where: { key: s2.key },
      update: { value: s2.value as never, group: s2.group, description: s2.description },
      create: s2
    })
  }
  console.log(`  -> inserted/updated ${settings.length} settings`)
    const counts = {
    users: await prisma.user.count(),
    categories: await prisma.category.count(),
    products: await prisma.product.count(),
    banners: await prisma.banner.count(),
    orders: await prisma.order.count(),
    coupons: couponSeeds.length,
    userCoupons: 5,
    reviews: reviewCount,
    auditLogs: auditCount,
    settings: settings.length,
    roles: await prisma.role.count(),
    adminUsers: await prisma.adminUser.count()
  }
  console.log('Seed complete:', counts)
  console.log('Admin login: username=admin / password=admin123  (SUPER_ADMIN)')
  console.log('Admin login: username=operator / password=admin123  (ADMIN)')
  console.log('User login (client): username=alice~eve / password=user123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })



