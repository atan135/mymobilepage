<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()

const nickname = computed(() => userStore.user?.nickname ?? '未登录')
const username = computed(() => userStore.user?.username ?? '-')
const phone = computed(() => userStore.user?.phone ?? '-')
const avatar = computed(
  () => userStore.user?.avatar ?? 'https://picsum.photos/seed/default/200/200'
)

const menus = [
  { icon: 'orders-o', label: '我的订单', desc: '查看全部订单' },
  { icon: 'balance-o', label: '优惠券', desc: '0 张可用' },
  { icon: 'location-o', label: '收货地址', desc: '管理收货地址' },
  { icon: 'service-o', label: '客户服务', desc: '联系客服 / 反馈' }
]

async function onLogout() {
  try {
    await showConfirmDialog({
      title: '退出登录',
      message: '确定要退出登录吗？'
    })
    await userStore.logout()
    showToast('已退出')
    router.replace('/login')
  } catch {
    /* cancelled */
  }
}
</script>

<template>
  <div class="profile">
    <van-nav-bar title="我的" fixed />

    <div class="content">
      <div class="user-card">
        <img class="avatar" :src="avatar" :alt="nickname" />
        <div class="meta">
          <div class="nickname">{{ nickname }}</div>
          <div class="username">账号：{{ username }} · {{ phone }}</div>
        </div>
      </div>

      <van-cell-group inset class="menu">
        <van-cell
          v-for="m in menus"
          :key="m.label"
          :title="m.label"
          :label="m.desc"
          :icon="m.icon"
          is-link
        />
      </van-cell-group>

      <div class="actions">
        <van-button block round type="danger" plain @click="onLogout">
          退出登录
        </van-button>
      </div>

      <div class="footer">© 2026 mymobilepage · 演示版</div>
    </div>
  </div>
</template>

<style scoped>
.profile {
  min-height: 100vh;
  background: #f7f8fa;
}
.content {
  padding: 56px 0 80px;
}
.user-card {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 16px;
  padding: 20px 16px;
  background: linear-gradient(135deg, #ee0a24, #ff5b5b);
  color: #fff;
  border-radius: 12px;
}
.avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
  background: #fff;
}
.meta {
  flex: 1;
}
.nickname {
  font-size: 18px;
  font-weight: 600;
}
.username {
  font-size: 12px;
  opacity: 0.85;
  margin-top: 4px;
}
.menu {
  margin-top: 8px;
}
.actions {
  margin: 24px 16px;
}
.footer {
  text-align: center;
  color: #969799;
  font-size: 12px;
  margin-top: 32px;
}
</style>