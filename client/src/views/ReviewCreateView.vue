<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import { createReview, getCanReview } from '../api/review'
import { getOrder, type OrderItem } from '../api/order'
import { errorMessage } from '../api/request'

const route = useRoute()
const router = useRouter()

const orderId = computed(() => Number(route.query.orderId))
const productId = computed(() => Number(route.query.productId))

const rating = ref(5)
const content = ref('')
const images = ref<string[]>([])
const imageUrlInput = ref('')
const imageDialogVisible = ref(false)
const submitting = ref(false)
const loading = ref(false)
const product = ref<OrderItem | null>(null)

const RATING_LABELS = ['非常差', '不满意', '一般', '满意', '非常满意'] as const

const contentCount = computed(() => content.value.length)
const canSubmit = computed(
  () =>
    !loading.value &&
    !submitting.value &&
    rating.value >= 1 &&
    content.value.trim().length > 0 &&
    content.value.length <= 1000
)

async function loadProduct() {
  if (!orderId.value || !productId.value) {
    showToast('参数缺失')
    router.replace('/order/list')
    return
  }
  loading.value = true
  try {
    const [order, canReview] = await Promise.all([
      getOrder(orderId.value),
      getCanReview(orderId.value)
    ])
    const item = order.items.find((i) => i.productId === productId.value)
    if (!item) {
      showToast('订单中找不到该商品')
      router.replace({ name: 'order-detail', query: { id: orderId.value } })
      return
    }
    product.value = item
    const allowed = canReview.items.find((i) => i.productId === productId.value)
    if (!allowed?.canReview) {
      showToast('该商品不可评价')
      router.replace({ name: 'order-detail', query: { id: orderId.value } })
    }
  } catch (e: unknown) {
    showToast(errorMessage(e, '加载失败'))
    router.replace({ name: 'order-detail', query: { id: orderId.value } })
  } finally {
    loading.value = false
  }
}

onMounted(loadProduct)

function openImageDialog() {
  if (images.value.length >= 9) {
    showToast('最多 9 张图')
    return
  }
  imageUrlInput.value = ''
  imageDialogVisible.value = true
}

function confirmAddImage() {
  const url = imageUrlInput.value.trim()
  if (!url) {
    showToast('请填写图片 URL')
    return
  }
  if (images.value.length >= 9) {
    showToast('最多 9 张图')
    return
  }
  images.value.push(url)
  imageUrlInput.value = ''
  imageDialogVisible.value = false
}

function removeImage(i: number) {
  images.value.splice(i, 1)
}

async function onSubmit() {
  if (!canSubmit.value) return
  submitting.value = true
  try {
    await createReview({
      orderId: orderId.value,
      productId: productId.value,
      rating: rating.value,
      content: content.value.trim(),
      images: images.value
    })
    showToast({ type: 'success', message: '评价已提交，待审核' })
    router.replace({ name: 'order-detail', query: { id: orderId.value } })
  } catch (e: unknown) {
    showToast(errorMessage(e, '提交失败'))
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="page">
    <van-nav-bar title="发表评价" left-arrow fixed @click-left="router.back()" />

    <div class="content">
      <!-- 商品预览 -->
      <section v-if="product" class="card product">
        <img class="product-cover" :src="product.productCover" :alt="product.productTitle" />
        <div class="product-info">
          <div class="product-title">{{ product.productTitle }}</div>
          <div class="product-price">¥{{ Number(product.price).toFixed(2) }}</div>
        </div>
      </section>

      <!-- 评分 -->
      <section class="card rating">
        <div class="card-title">评分</div>
        <div class="rating-row">
          <van-rate
            v-model="rating"
            size="32"
            gutter="6"
            color="#f7ba2e"
            void-color="#ececec"
          />
          <span class="rating-label">{{ RATING_LABELS[rating - 1] }}</span>
        </div>
      </section>

      <!-- 评价内容 -->
      <section class="card">
        <div class="card-title">评价内容</div>
        <textarea
          v-model="content"
          class="content-input"
          rows="5"
          maxlength="1000"
          placeholder="说说你的使用感受，限 1000 字"
        />
        <div class="content-footer">
          <span class="counter" :class="{ over: contentCount > 1000 }">
            {{ contentCount }}/1000
          </span>
        </div>
      </section>

      <!-- 图片 -->
      <section class="card">
        <div class="card-title">
          图片
          <span class="card-title-extra">（可选，最多 9 张）</span>
        </div>
        <div class="image-grid">
          <div v-for="(url, i) in images" :key="i" class="image-tile">
            <img :src="url" :alt="`图片${i + 1}`" />
            <button class="image-remove" type="button" @click="removeImage(i)">×</button>
          </div>
          <button
            v-if="images.length < 9"
            type="button"
            class="image-tile image-add"
            @click="openImageDialog"
          >
            <span class="plus">+</span>
            <span class="add-label">添加图片</span>
          </button>
        </div>
      </section>
    </div>

    <div class="submit-bar">
      <button
        type="button"
        class="submit-btn"
        :disabled="!canSubmit"
        @click="onSubmit"
      >
        {{ submitting ? '提交中...' : '提交评价' }}
      </button>
    </div>

    <van-dialog
      v-model:show="imageDialogVisible"
      title="添加图片"
      show-cancel-button
      confirm-button-text="添加"
      @confirm="confirmAddImage"
    >
      <div class="image-dialog">
        <van-field
          v-model="imageUrlInput"
          placeholder="请粘贴图片 URL"
          clearable
        />
        <p class="image-dialog-tip">支持 jpg / png / webp 等公网可访问的图片链接</p>
      </div>
    </van-dialog>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #f5f6f8;
}

.content {
  padding: 46px 12px 96px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #323233;
  margin-bottom: 12px;
}

.card-title-extra {
  font-weight: 400;
  font-size: 13px;
  color: #969799;
  margin-left: 4px;
}

/* 商品预览 */
.product {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
}

.product-cover {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
  background: #f5f5f5;
}

.product-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.product-title { font-size: 14px; line-height: 1.4; color: #323233; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.product-price {
  font-size: 15px;
  font-weight: 600;
  color: #ee0a24;
}

/* 评分 */
.rating-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.rating-label {
  font-size: 14px;
  color: #f7ba2e;
  font-weight: 500;
  flex-shrink: 0;
}

/* 评价内容 */
.content-input {
  width: 100%;
  min-height: 96px;
  padding: 10px 12px;
  border: 1px solid #ebedf0;
  border-radius: 8px;
  background: #fafafa;
  font-size: 14px;
  line-height: 1.5;
  color: #323233;
  resize: vertical;
  outline: none;
  transition: border-color 0.15s, background 0.15s;
  font-family: inherit;
}

.content-input:focus {
  border-color: #1989fa;
  background: #fff;
}

.content-input::placeholder {
  color: #c8c9cc;
}

.content-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 6px;
}

.counter {
  font-size: 12px;
  color: #969799;
}

.counter.over {
  color: #ee0a24;
}

/* 图片宫格 */
.image-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.image-tile {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  background: #f5f5f5;
  border: 0;
  padding: 0;
  margin: 0;
}

.image-tile img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.image-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  border: 0;
  font-size: 16px;
  line-height: 18px;
  padding: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: 1px dashed #dcdee0;
  background: #fafafa;
  color: #969799;
  cursor: pointer;
  font-size: 12px;
}

.image-add .plus {
  font-size: 24px;
  line-height: 1;
  color: #c8c9cc;
}

.image-add:active {
  background: #f2f3f5;
}

/* 提交栏 */
.submit-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 8px 12px calc(8px + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.04);
  z-index: 10;
}

.submit-btn {
  width: 100%;
  height: 44px;
  border: 0;
  border-radius: 22px;
  background: linear-gradient(135deg, #1989fa, #1572e8);
  color: #fff;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.submit-btn:not(:disabled):active {
  opacity: 0.85;
}

/* 图片弹窗 */
.image-dialog {
  padding: 16px;
}

.image-dialog-tip {
  margin: 8px 0 0;
  font-size: 12px;
  color: #969799;
  line-height: 1.4;
}
</style>



