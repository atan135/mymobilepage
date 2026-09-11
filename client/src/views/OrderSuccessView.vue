<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const orderId = Number(route.query.id)
</script>

<template>
  <div class="success">
    <van-nav-bar title="下单成功" left-arrow fixed @click-left="router.back()" />

    <div class="content">
      <van-empty
        v-if="!orderId"
        description="订单信息缺失"
        image="error"
      />

      <template v-else>
        <div class="hero">
          <van-icon name="passed" class="icon" />
          <div class="title">下单成功</div>
          <div class="subtitle">订单已生成，支付已模拟成功</div>
        </div>

        <div class="block">
          <van-button
            block
            round
            type="primary"
            @click="router.replace({ name: 'order-detail', query: { id: orderId } })"
          >
            查看订单详情
          </van-button>
          <van-button
            block
            round
            plain
            class="secondary"
            @click="router.replace('/home')"
          >
            返回首页
          </van-button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.success { min-height: 100vh; background: #f7f8fa; }
.content { padding: 56px 16px; }
.hero {
  text-align: center;
  padding: 60px 0 30px;
}
.hero .icon {
  font-size: 96px;
  color: #07c160;
}
.hero .title {
  font-size: 20px;
  font-weight: 600;
  margin-top: 16px;
}
.hero .subtitle {
  font-size: 13px;
  color: #969799;
  margin-top: 8px;
}
.block { margin-top: 40px; }
.secondary { margin-top: 12px; }
</style>
