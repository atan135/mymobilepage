import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'vant/lib/index.css'
import 'vant/es/toast/style/index'
import 'vant/es/dialog/style/index'
import 'vant/es/action-sheet/style/index'
import './styles/main.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')