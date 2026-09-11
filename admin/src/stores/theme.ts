import { defineStore } from 'pinia'
import { computed, ref, watchEffect } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'admin-theme'

/**
 * 主题 store。
 * - mode 是用户选择的偏好（light / dark / system）
 * - resolved 是实际生效的主题（system 时跟 OS prefers-color-scheme）
 * - 通过给 <html> 加 data-theme 属性 + class="dark" 驱动 Element Plus 与自定义 CSS 变量
 */
export const useThemeStore = defineStore(
  'admin-theme',
  () => {
    const mode = ref<ThemeMode>('light')

    const systemPrefersDark = ref(false)

    if (typeof window !== 'undefined' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      systemPrefersDark.value = mq.matches
      mq.addEventListener('change', (e) => {
        systemPrefersDark.value = e.matches
      })
    }

    const resolved = computed<'light' | 'dark'>(() =>
      mode.value === 'system' ? (systemPrefersDark.value ? 'dark' : 'light') : mode.value
    )

    function setMode(m: ThemeMode) {
      mode.value = m
    }

    function applyToDom() {
      const html = document.documentElement
      if (resolved.value === 'dark') {
        html.setAttribute('data-theme', 'dark')
        html.classList.add('dark')
      } else {
        html.setAttribute('data-theme', 'light')
        html.classList.remove('dark')
      }
    }

    watchEffect(() => {
      applyToDom()
    })

    return { mode, resolved, setMode }
  },
  {
    persist: {
      key: STORAGE_KEY,
      paths: ['mode']
    }
  }
)
