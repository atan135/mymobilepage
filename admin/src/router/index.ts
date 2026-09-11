import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAdminAuthStore } from '../stores/admin-auth'

const AdminLayout = () => import('../layouts/AdminLayout.vue')

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { title: '登录', requiresAuth: false }
  },
  {
    path: '/',
    component: AdminLayout,
    redirect: '/dashboard',
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('../views/DashboardView.vue'),
        meta: { title: '仪表盘', icon: 'House', permission: 'dashboard:view' }
      },
      {
        path: 'users',
        name: 'admin-users',
        component: () => import('../views/UserListView.vue'),
        meta: { title: '用户管理', icon: 'User', permission: 'user:list' }
      },
      {
        path: 'categories',
        name: 'admin-categories',
        component: () => import('../views/CategoryListView.vue'),
        meta: { title: '分类管理', icon: 'Menu', permission: 'category:list' }
      },
      {
        path: 'products',
        name: 'admin-products',
        component: () => import('../views/ProductListView.vue'),
        meta: { title: '商品管理', icon: 'Goods', permission: 'product:list' }
      },
      {
        path: 'orders',
        name: 'admin-orders',
        component: () => import('../views/OrderListView.vue'),
        meta: { title: '订单管理', icon: 'List', permission: 'order:list' }
      },
      {
        path: 'reviews',
        name: 'admin-reviews',
        component: () => import('../views/ReviewListView.vue'),
        meta: { title: '评价管理', icon: 'ChatDotRound', permission: 'review:list' }
      },
      {
        path: 'inventory/logs',
        name: 'admin-inventory-logs',
        component: () => import('../views/InventoryLogListView.vue'),
        meta: { title: '库存流水', icon: 'List', permission: 'inventory:list' }
      },
      {
        path: 'inventory/warnings',
        name: 'admin-inventory-warnings',
        component: () => import('../views/InventoryWarningListView.vue'),
        meta: { title: '库存预警', icon: 'Warning', permission: 'inventory:warning' }
      },
      {
        path: 'reviews/:id',
        name: 'admin-review-detail',
        component: () => import('../views/ReviewDetailView.vue'),
        meta: { title: '评价详情', icon: 'ChatDotRound', permission: 'review:detail' }
      },
      {
        path: 'refunds',
        name: 'admin-refunds',
        component: () => import('../views/RefundListView.vue'),
        meta: { title: '退款审批', icon: 'Refresh', permission: 'refund:list' }
      },
      {
        path: 'refunds/:id',
        name: 'admin-refund-detail',
        component: () => import('../views/RefundDetailView.vue'),
        meta: { title: '退款详情', icon: 'Refresh', permission: 'refund:detail' }
      },
      {
        path: 'banners',
        name: 'admin-banners',
        component: () => import('../views/BannerListView.vue'),
        meta: { title: '轮播图管理', icon: 'Picture', permission: 'banner:list' }
      },
      {
        path: 'announcements',
        name: 'admin-announcements',
        component: () => import('../views/AnnouncementListView.vue'),
        meta: { title: '首页公告', icon: 'Bell', permission: 'announcement:list' }
      },
      {
        path: 'coupons',
        name: 'admin-coupons',
        component: () => import('../views/CouponListView.vue'),
        meta: { title: '优惠券管理', icon: 'Discount', permission: 'coupon:list' }
      },
      {
        path: 'coupons/:id/claims',
        name: 'admin-coupon-claims',
        component: () => import('../views/CouponClaimsView.vue'),
        meta: { title: '领取明细', icon: 'Discount', permission: 'coupon:list' }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to) => {
  const auth = useAdminAuthStore()
  const requiresAuth = to.meta.requiresAuth !== false

  if (requiresAuth && !auth.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.name === 'login' && auth.isLoggedIn) {
    return { name: 'dashboard' }
  }

  const perm = to.meta.permission
  if (typeof perm === 'string' && !auth.hasPermission(perm)) {
    return { name: 'dashboard' }
  }

  if (typeof to.meta.title === 'string') {
    document.title = `${to.meta.title} · 管理后台`
  }
})

export default router
