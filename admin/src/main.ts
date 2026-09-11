import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPersistedstate from 'pinia-plugin-persistedstate'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

import './styles/main.css'
import App from './App.vue'
import router from './router'
import permissionDirective from './directives/permission'
import { useThemeStore } from './stores/theme'

const app = createApp(App)

const pinia = createPinia()
pinia.use(piniaPersistedstate)
app.use(pinia)

// 在挂载之前初始化主题，避免页面闪烁（store 创建时 watchEffect 会立即跑一次）
useThemeStore()

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component as never)
}

app.use(ElementPlus, { locale: zhCn })
app.directive("permission", permissionDirective)
app.use(router)

app.mount('#app')
