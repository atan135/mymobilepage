<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ElMessage,
  ElMessageBox
} from 'element-plus'
import {
  House,
  SwitchButton,
  UserFilled
} from '@element-plus/icons-vue'
import { useAdminAuthStore } from '../stores/admin-auth'

interface MenuItem {
  path: string
  title: string
  icon: string
  permission?: string
}

const router = useRouter()
const route = useRoute()
const auth = useAdminAuthStore()

const collapsed = ref(false)

// Phase 1 第一版菜单（其它模块在后续迭代接入）
const menuItems = computed<MenuItem[]>(() => [
  { path: '/dashboard', title: '仪表盘', icon: 'House', permission: 'dashboard:view' }
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
        background-color="#001529"
        text-color="#cfd3dc"
        active-text-color="#ffffff"
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
  background: #001529;
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
  background: #409eff;
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
  background: #fff;
  border-bottom: 1px solid #ebeef5;
  padding: 0 16px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.crumb {
  font-size: 15px;
  font-weight: 500;
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
  background: #f5f7fa;
}
.name {
  font-size: 14px;
}
.main {
  background: #f5f7fa;
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