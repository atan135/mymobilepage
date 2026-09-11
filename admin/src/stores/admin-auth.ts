import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import * as api from '../api/admin-auth'
import type { AdminUser } from '../api/admin-auth'

export const useAdminAuthStore = defineStore(
  'admin-auth',
  () => {
    const token = ref<string>(localStorage.getItem('admin-token') ?? '')
    const user = ref<AdminUser | null>(readUser())

    const isLoggedIn = computed(() => !!token.value)
    const permissions = computed<string[]>(() => user.value?.permissions ?? [])

    function hasPermission(p: string): boolean {
      if (!user.value) return false
      // 通配 * 表示超管
      if (permissions.value.includes('*')) return true
      return permissions.value.includes(p)
    }

    async function login(payload: api.AdminLoginPayload) {
      const res = await api.adminLogin(payload)
      token.value = res.token
      user.value = res.user
      localStorage.setItem('admin-token', res.token)
      localStorage.setItem('admin-user', JSON.stringify(res.user))
      return res
    }

    async function logout() {
      try {
        await api.adminLogout()
      } catch {
        /* 即使服务端 logout 失败也要清本地状态 */
      }
      token.value = ''
      user.value = null
      localStorage.removeItem('admin-token')
      localStorage.removeItem('admin-user')
    }

    async function fetchProfile() {
      user.value = await api.adminProfile()
      localStorage.setItem('admin-user', JSON.stringify(user.value))
    }

    return { token, user, isLoggedIn, permissions, hasPermission, login, logout, fetchProfile }
  },
  {
    persist: {
      key: 'admin-auth',
      paths: ['token', 'user']
    }
  }
)

function readUser(): AdminUser | null {
  const raw = localStorage.getItem('admin-user')
  if (!raw) return null
  try {
    return JSON.parse(raw) as AdminUser
  } catch {
    return null
  }
}