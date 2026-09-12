<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import { getProduct, type Product } from '../api/product'
import {
  listProductReviews,
  type PublicReviewItem,
  type ProductReviewSummary
} from '../api/review'
import { useCartStore } from '../stores/cart'
import { errorMessage } from '../api/request'

const route = useRoute()
const router = useRouter()
const cart = useCartStore()
const product = ref<Product | null>(null)
const loading = ref(true)
const count = ref(1)

const reviewSummary = ref<ProductReviewSummary | null>(null)
const reviews = ref<PublicReviewItem[]>([])

const visibleReviews = computed(() => reviews.value)

async function load(id: number) {
  loading.value = true
  try {
    product.value = await getProduct(id)
    try {
      const r = await listProductReviews(id, { page: 1, pageSize: 10 })
      reviewSummary.value = r.summary
      reviews.value = r.list
    } catch {
      reviewSummary.value = null
      reviews.value = []
    }
  } catch (e: unknown) {
    const msg = errorMessage(e, '加载失败')
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

function stars(n: number): string {
  return '★★★★★☆☆☆☆☆'.slice(5 - n, 10 - n)
}

function userName(r: PublicReviewItem): string {
  return r.user?.nickname ?? r.user?.username ?? '匿名用户'
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

        <van-cell-group
          v-if="reviewSummary && reviewSummary.total > 0"
          inset
          title="商品评价"
          class="block"
        >
          <van-cell>
            <template #title>
              <span class="rev-avg">★ {{ reviewSummary.average.toFixed(1) }}</span>
              <span class="rev-total">共 {{ reviewSummary.total }} 条评价</span>
            </template>
          </van-cell>
          <div
            v-for="r in visibleReviews"
            :key="r.id"
            class="review-item"
          >
            <div class="review-head">
              <span class="review-user">{{ userName(r) }}</span>
              <span class="review-stars">{{ stars(r.rating) }}</span>
              <span class="review-date">{{ new Date(r.createdAt).toLocaleDateString() }}</span>
            </div>
            <div class="review-content">{{ r.content }}</div>
            <div
              v-if="r.images && r.images.length"
              class="review-images"
            >
              <van-image
                v-for="(url, i) in r.images"
                :key="i"
                :src="url"
                width="64"
                height="64"
                fit="cover"
              />
            </div>
            <div v-if="r.reply" class="review-reply">
              <span class="reply-label">商家回复：</span>{{ r.reply }}
            </div>
          </div>
        </van-cell-group>
      </div>

      <van-action-bar safe-area-inset-bottom>
        <van-action-bar-icon icon="chat-o" text="客服" />
        <van-action-bar-icon icon="cart-o" :badge="cart.totalCount || ''" text="购物车" @click="router.push('/cart')" />
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
  font-size: 13px;
  margin-left: 8px;
  text-decoration: line-through;
}
.title {
  margin-top: 8px;
  font-size: 16px;
  font-weight: 500;
  line-height: 1.4;
}
.sales {
  margin-top: 8px;
  color: #969799;
  font-size: 12px;
}
.desc {
  padding: 12px 16px;
  color: #606266;
  line-height: 1.6;
  white-space: pre-wrap;
  font-size: 14px;
}
.block {
  margin-top: 12px;
}
.rev-avg {
  color: #f7ba2e;
  font-weight: 600;
  font-size: 18px;
}
.rev-total {
  margin-left: 8px;
  color: #606266;
  font-size: 13px;
}
.review-item {
  padding: 12px 16px;
  border-top: 1px dashed #ebedf0;
  background: #fff;
}
.review-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #606266;
}
.review-user {
  color: #1989fa;
  font-weight: 500;
}
.review-stars {
  color: #f7ba2e;
  letter-spacing: 1px;
}
.review-date {
  margin-left: auto;
  color: #969799;
}
.review-content {
  margin-top: 6px;
  font-size: 14px;
  color: #303133;
  line-height: 1.5;
  white-space: pre-wrap;
}
.review-images {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.review-reply {
  margin-top: 8px;
  padding: 8px;
  background: #f0f9eb;
  border-left: 3px solid #67c23a;
  font-size: 13px;
  color: #303133;
  border-radius: 2px;
}
.reply-label {
  color: #67c23a;
  font-weight: 500;
}
</style>
