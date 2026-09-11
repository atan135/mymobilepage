import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useUserStore } from '../stores/user'

const TabBarLayout = () => import('../layouts/TabBarLayout.vue')

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/',
    component: TabBarLayout,
    redirect: '/home',
    children: [
      {
        path: 'home',
        name: 'home',
        component: () => import('../views/HomeView.vue'),
        meta: { title: '首页', requiresAuth: true }
      },
      {
        path: 'category',
        name: 'category',
        component: () => import('../views/CategoryView.vue'),
        meta: { title: '分类', requiresAuth: true }
      },
      {
        path: 'cart',
        name: 'cart',
        component: () => import('../views/CartView.vue'),
        meta: { title: '购物车', requiresAuth: true }
      },
      {
        path: 'profile',
        name: 'profile',
        component: () => import('../views/ProfileView.vue'),
        meta: { title: '我的', requiresAuth: true }
      }
    ]
  },
  {
    path: '/product/:id',
    name: 'product-detail',
    component: () => import('../views/ProductDetailView.vue'),
    meta: { title: '商品详情', requiresAuth: true }
  },
  {
    path: '/order/confirm',
    name: 'order-confirm',
    component: () => import('../views/OrderConfirmView.vue'),
    meta: { title: '确认订单', requiresAuth: true }
  },
  {
    path: '/order/success',
    name: 'order-success',
    component: () => import('../views/OrderSuccessView.vue'),
    meta: { title: '下单成功', requiresAuth: true }
  },
  {
    path: '/order/list',
    name: 'order-list',
    component: () => import('../views/OrderListView.vue'),
    meta: { title: '我的订单', requiresAuth: true }
  },
  {
    path: '/order/detail',
    name: 'order-detail',
    component: () => import('../views/OrderDetailView.vue'),
    meta: { title: '订单详情', requiresAuth: true }
  },
  {
    path: '/coupons',
    name: 'coupons',
    component: () => import('../views/CouponCenterView.vue'),
    meta: { title: '领券中心', requiresAuth: true }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/home'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to) => {
  const userStore = useUserStore()
  const requiresAuth = to.meta.requiresAuth === true

  if (requiresAuth && !userStore.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.name === 'login' && userStore.isLoggedIn) {
    return { name: 'home' }
  }

  if (typeof to.meta.title === 'string') {
    document.title = `${to.meta.title} · 我的商城`
  }
})

export default router
