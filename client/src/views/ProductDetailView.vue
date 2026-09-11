<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import { getProduct, type Product } from '../api/product'
import { useCartStore } from '../stores/cart'

const route = useRoute()
const router = useRouter()
const cart = useCartStore()
const product = ref<Product | null>(null)
const loading = ref(true)
const count = ref(1)

async function load(id: number) {
  loading.value = true
  try {
    product.value = await getProduct(id)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '加载失败'
    showToast(msg)
    router.replace('/home')
  } finally {
    loading.value = false
  }
}

onMounted(() => load(Number(route.params.id)))
watch(
  () => route.params.id,
  (v) => v && load(Number(v))
)

function addToCart() {
  if (!product.value) return
  cart.add(product.value.id, count.value)
  showToast({ type: 'success', message: `已加入购物车 ×${count.value}` })
}

function buyNow() {
  if (!product.value) return
  router.push({
    path: '/order/confirm',
    query: { productId: product.value.id, quantity: count.value }
  })
}
</script>

<template>
  <div class="detail">
    <van-nav-bar
      title="商品详情"
      left-arrow
      fixed
      @click-left="router.back()"
    />

    <div v-if="loading" class="loading">
      <van-loading size="24" type="circular">加载中...</van-loading>
    </div>

    <template v-else-if="product">
      <div class="content">
        <van-swipe
          :autoplay="4000"
          indicator-color="white"
          class="gallery"
        >
          <van-swipe-item v-for="(img, i) in product.images" :key="i">
            <img :src="img" :alt="`img-${i}`" />
          </van-swipe-item>
        </van-swipe>

        <div class="info">
          <div class="price">
            <span class="now">¥{{ product.price }}</span>
            <span v-if="product.originalPrice" class="origin">¥{{ product.originalPrice }}</span>
          </div>
          <div class="title">{{ product.title }}</div>
          <div class="sales">已售 {{ product.sales }} · 库存 {{ product.stock }}</div>
        </div>

        <van-cell-group inset title="规格">
          <van-cell title="数量">
            <template #value>
              <van-stepper v-model="count" :min="1" :max="Math.max(1, product.stock)" />
            </template>
          </van-cell>
        </van-cell-group>

        <van-cell-group inset title="商品介绍">
          <div class="desc">{{ product.description }}</div>
        </van-cell-group>
      </div>

      <van-action-bar safe-area-inset-bottom>
        <van-action-bar-icon icon="chat-o" text="客服" />
        <van-action-bar-icon icon="cart-o" text="购物车" @click="router.push('/cart')" />
        <van-action-bar-button type="warning" text="加入购物车" @click="addToCart" />
        <van-action-bar-button type="danger" text="立即购买" @click="buyNow" />
      </van-action-bar>
    </template>
  </div>
</template>

<style scoped>
.detail {
  min-height: 100vh;
  background: #f7f8fa;
}
.loading {
  padding-top: 80px;
  text-align: center;
}
.content {
  padding: 46px 0 60px;
}
.gallery {
  height: 320px;
  background: #fff;
}
.gallery :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.info {
  background: #fff;
  padding: 16px;
  margin-top: 8px;
}
.price .now {
  color: var(--van-primary-color);
  font-size: 22px;
  font-weight: 600;
}
.price .origin {
  color: #969799;
  text-decoration: line-through;
  margin-left: 8px;
  font-size: 13px;
}
.title {
  margin-top: 8px;
  font-size: 15px;
  font-weight: 500;
  color: #323233;
}
.sales {
  margin-top: 8px;
  color: #969799;
  font-size: 12px;
}
.desc {
  padding: 16px;
  color: #323233;
  line-height: 1.6;
  font-size: 14px;
}
</style>
