<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ElMessage,
  ElMessageBox
} from 'element-plus'
import {
  House,
  User,
  Menu,
  Goods,
  List,
  Picture,
  Bell,
  SwitchButton,
  UserFilled,
  Sunny,
  Moon,
  Monitor
} from '@element-plus/icons-vue'
import { useAdminAuthStore } from '../stores/admin-auth'
import { useThemeStore, type ThemeMode } from '../stores/theme'

interface MenuItem {
  path: string
  title: string
  icon: string
  permission?: string
}

const router = useRouter()
const route = useRoute()
const auth = useAdminAuthStore()
const theme = useThemeStore()

const collapsed = ref(false)

const menuItems = computed<MenuItem[]>(() => [
  { path: '/dashboard', title: '仪表盘', icon: 'House', permission: 'dashboard:view' },
  { path: '/users', title: '用户管理', icon: 'User', permission: 'user:list' },
  { path: '/categories', title: '分类管理', icon: 'Menu', permission: 'category:list' },
  { path: '/products', title: '商品管理', icon: 'Goods', permission: 'product:list' },
  { path: '/orders', title: '订单管理', icon: 'List', permission: 'order:list' },
  { path: '/banners', title: '轮播图管理', icon: 'Picture', permission: 'banner:list' },
  { path: '/announcements', title: '首页公告', icon: 'Bell', permission: 'announcement:list' },
  { path: '/coupons', title: '优惠券管理', icon: 'Discount', permission: 'coupon:list' },
  { path: '/reviews', title: '评价管理', icon: 'ChatDotRound', permission: 'review:list' },
  { path: '/audit-logs', title: '操作日志', icon: 'Document', permission: 'audit:view' },
  { path: '/settings', title: '系统设置', icon: 'Setting', permission: 'setting:edit' },
  { path: '/inventory/warnings', title: '库存预警', icon: 'Warning', permission: 'inventory:warning' },
  { path: '/refunds', title: '退款审批', icon: 'Refresh', permission: 'refund:list' }
])

const breadcrumb = computed(() => {
  const t = route.meta.title
  return typeof t === 'string' ? t : '首页'
})

const activePath = computed(() => route.path)

async function onLogout() {
  try {
    await ElMessageBox.confirm('确认退出当前账号？', '提示', {
      type: 'warning',
      confirmButtonText: '退出',
      cancelButtonText: '取消'
    })
  } catch {
    return
  }
  await auth.logout()
  ElMessage.success('已退出登录')
  router.replace('/login')
}

function goProfile() {
  ElMessage.info(`当前角色：${auth.user?.role ?? '-'}`)
}

/** 切换主题时给根节点挂短暂过渡 class，避免长期 transition 成本 */
function setTheme(m: ThemeMode) {
  const html = document.documentElement
  html.classList.add('theme-transition')
  theme.setMode(m)
  window.setTimeout(() => html.classList.remove('theme-transition'), 220)
}

const themeIcon = computed(() => {
  if (theme.mode === 'light') return Sunny
  if (theme.mode === 'dark') return Moon
  return Monitor
})

const themeLabel = computed(() => {
  if (theme.mode === 'light') return '浅色'
  if (theme.mode === 'dark') return '深色'
  return '跟随系统'
})
</script>

<template>
  <el-container class="layout">
    <el-aside :width="collapsed ? '64px' : '220px'" class="aside">
      <div class="logo">
        <span class="brand">M</span>
        <span v-if="!collapsed" class="brand-text">商城后台</span>
      </div>
      <el-menu
        :default-active="activePath"
        :collapse="collapsed"
        :collapse-transition="false"
        router
        background-color="var(--app-aside-bg)"
        text-color="var(--app-aside-text-color)"
        active-text-color="var(--app-aside-text-active)"
      >
        <el-menu-item
          v-for="m in menuItems"
          :key="m.path"
          :index="m.path"
          v-permission="m.permission"
        >
          <el-icon><component :is="m.icon" /></el-icon>
          <template #title>{{ m.title }}</template>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header">
        <div class="header-left">
          <el-button text @click="collapsed = !collapsed">
            <el-icon><component :is="collapsed ? 'Expand' : 'Fold'" /></el-icon>
          </el-button>
          <span class="crumb">{{ breadcrumb }}</span>
        </div>
        <div class="header-right">
          <el-dropdown trigger="click" @command="(c: ThemeMode) => setTheme(c)">
            <span class="theme-toggle" :title="`当前：${themeLabel}`">
              <el-icon class="theme-icon"><component :is="themeIcon" /></el-icon>
              <span class="theme-label">{{ themeLabel }}</span>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="light" :disabled="theme.mode === 'light'">
                  <el-icon><component :is="Sunny" /></el-icon>浅色
                </el-dropdown-item>
                <el-dropdown-item command="dark" :disabled="theme.mode === 'dark'">
                  <el-icon><component :is="Moon" /></el-icon>深色
                </el-dropdown-item>
                <el-dropdown-item command="system" :disabled="theme.mode === 'system'">
                  <el-icon><component :is="Monitor" /></el-icon>跟随系统
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>

          <el-dropdown @command="(c: string) => c === 'logout' && onLogout()">
            <span class="user">
              <el-avatar :size="28" :icon="UserFilled" />
              <span class="name">{{ auth.user?.nickname ?? auth.user?.username ?? '未登录' }}</span>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="goProfile">个人信息</el-dropdown-item>
                <el-dropdown-item divided command="logout">
                  <el-icon><SwitchButton /></el-icon>退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="main">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.layout {
  height: 100vh;
}
.aside {
  background: var(--app-aside-bg);
  transition: width 0.2s ease;
}
.logo {
  height: 56px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  color: #fff;
}
.brand {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: var(--app-brand);
  color: #fff;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.brand-text {
  font-size: 16px;
  font-weight: 600;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--app-header-bg);
  border-bottom: 1px solid var(--app-border-color);
  padding: 0 16px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.crumb {
  font-size: 15px;
  font-weight: 500;
  color: var(--app-text-primary);
}
.theme-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: var(--app-text-regular);
  user-select: none;
}
.theme-toggle:hover {
  background: var(--app-bg);
  color: var(--app-text-primary);
}
.theme-icon {
  font-size: 16px;
}
.theme-label {
  font-size: 13px;
}
.user {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}
.user:hover {
  background: var(--app-bg);
}
.name {
  font-size: 14px;
  color: var(--app-text-primary);
}
.main {
  background: var(--app-bg);
  padding: 16px;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
