<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const tabs = [
  { name: 'home', title: '首页', icon: 'home-o' },
  { name: 'category', title: '分类', icon: 'apps-o' },
  { name: 'cart', title: '购物车', icon: 'cart-o' },
  { name: 'profile', title: '我的', icon: 'user-o' }
]

const active = computed<string>(() => {
  const name = route.name?.toString() ?? ''
  return tabs.some((t) => t.name === name) ? name : 'home'
})

function onChange(name: string | number) {
  if (typeof name === 'string') {
    router.push({ name })
  }
}
</script>

<template>
  <div class="layout">
    <router-view v-slot="{ Component }">
      <component :is="Component" />
    </router-view>
    <van-tabbar
      :model-value="active"
      @change="onChange"
      safe-area-inset-bottom
      active-color="#ee0a24"
    >
      <van-tabbar-item
        v-for="t in tabs"
        :key="t.name"
        :name="t.name"
        :icon="t.icon"
      >
        {{ t.title }}
      </van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--van-background-2);
}
</style>