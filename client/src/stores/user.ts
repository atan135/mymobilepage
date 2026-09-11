import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as authApi from '../api/auth'
import type { User } from '../api/auth'

export const useUserStore = defineStore('user', () => {
  const token = ref<string>(localStorage.getItem('token') || '')
  const user = ref<User | null>(readUser())

  const isLoggedIn = computed(() => !!token.value)

  async function login(payload: authApi.LoginPayload) {
    const res = await authApi.login(payload)
    token.value = res.token
    user.value = res.user
    localStorage.setItem('token', res.token)
    localStorage.setItem('user', JSON.stringify(res.user))
    return res
  }

  async function logout() {
    await authApi.logout()
    token.value = ''
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return { token, user, isLoggedIn, login, logout }
})

function readUser(): User | null {
  const cached = localStorage.getItem('user')
  if (!cached) return null
  try {
    return JSON.parse(cached) as User
  } catch {
    return null
  }
}
