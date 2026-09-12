<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import { createReview, getCanReview } from '../api/review'
import { errorMessage } from '../api/request'

const route = useRoute()
const router = useRouter()

const orderId = computed(() => Number(route.query.orderId))
const productId = computed(() => Number(route.query.productId))

const rating = ref(5)
const content = ref('')
const imageUrl = ref('')
const images = ref<string[]>([])
const loading = ref(false)
const submitting = ref(false)

onMounted(async () => {
  if (!orderId.value || !productId.value) {
    showToast('参数缺失')
    router.replace('/order/list')
    return
  }
  loading.value = true
  try {
    const r = await getCanReview(orderId.value)
    const item = r.items.find((i) => i.productId === productId.value)
    if (!item?.canReview) {
      showToast('该商品不可评价')
      router.replace({ name: 'order-detail', query: { id: orderId.value } })
    }
  } catch (e: unknown) {
    showToast(errorMessage(e, '加载失败'))
    router.replace({ name: 'order-detail', query: { id: orderId.value } })
  } finally {
    loading.value = false
  }
})

function addImage() {
  const url = imageUrl.value.trim()
  if (!url) return
  if (images.value.length >= 9) {
    showToast('最多 9 张图')
    return
  }
  images.value.push(url)
  imageUrl.value = ''
}

function removeImage(i: number) {
  images.value.splice(i, 1)
}

async function onSubmit() {
  if (rating.value < 1 || rating.value > 5) {
    showToast('请选择评分')
    return
  }
  if (!content.value.trim()) {
    showToast('请填写评价内容')
    return
  }
  if (content.value.length > 1000) {
    showToast('评价内容不超过 1000 字')
    return
  }
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
      <van-cell-group inset title="评分">
        <van-cell>
          <template #value>
            <van-rate
              v-model="rating"
              size="32"
              color="#f7ba2e"
              void-color="#eee"
            />
          </template>
        </van-cell>
      </van-cell-group>

      <van-cell-group inset title="评价内容" class="block">
        <van-field
          v-model="content"
          type="textarea"
          rows="5"
          maxlength="1000"
          show-word-limit
          placeholder="说说你的使用感受，限 1000 字"
        />
      </van-cell-group>

      <van-cell-group inset title="图片（可选，最多 9 张）" class="block">
        <van-field
          v-model="imageUrl"
          placeholder="粘贴图片 URL 后点击添加"
        >
          <template #button>
            <van-button size="small" type="primary" @click="addImage">添加</van-button>
          </template>
        </van-field>
        <div v-if="images.length" class="image-list">
          <van-image
            v-for="(url, i) in images"
            :key="i"
            :src="url"
            width="80"
            height="80"
            fit="cover"
            @click="removeImage(i)"
          />
        </div>
      </van-cell-group>
    </div>

    <van-submit-bar
      :loading="submitting"
      :button-text="loading ? '加载中...' : '提交评价'"
      button-color="#1989fa"
      @submit="onSubmit"
    />
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #f7f8fa;
}
.content {
  padding: 46px 0 80px;
}
.block {
  margin-top: 12px;
}
.image-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 16px;
}
</style>
