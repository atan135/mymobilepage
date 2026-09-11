<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getBanners, getCategories, getProducts } from '../api/product'
import type { Product, Category } from '../mock/data'

const router = useRouter()

const banners = ref<string[]>([])
const categories = ref<Category[]>([])
const products = ref<Product[]>([])
const refreshing = ref(false)
const listLoading = ref(false)
const finished = ref(false)
const page = ref(1)

async function loadBanners() {
  banners.value = await getBanners()
}

async function loadCategories() {
  categories.value = await getCategories()
}

async function loadProducts(reset = false) {
  if (reset) {
    page.value = 1
    products.value = []
    finished.value = false
  }
  const res = await getProducts({ page: page.value, pageSize: 10 })
  products.value.push(...res.list)
  if (!res.hasMore) finished.value = true
  else page.value += 1
}

async function init() {
  await Promise.all([loadBanners(), loadCategories()])
  await loadProducts(true)
}

onMounted(init)

function goDetail(id: number) {
  router.push(`/product/${id}`)
}

async function onRefresh() {
  refreshing.value = true
  try {
    await init()
  } finally {
    refreshing.value = false
  }
}

async function onLoad() {
  if (finished.value) return
  listLoading.value = true
  try {
    await loadProducts()
  } finally {
    listLoading.value = false
  }
}
</script>

<template>
  <div class="home">
    <van-nav-bar title="我的商城" fixed />

    <van-pull-refresh
      v-model="refreshing"
      @refresh="onRefresh"
      class="content"
    >
      <van-swipe
        :autoplay="4000"
        indicator-color="white"
        class="banner"
      >
        <van-swipe-item v-for="(b, i) in banners" :key="i">
          <img :src="b" :alt="`banner-${i}`" />
        </van-swipe-item>
      </van-swipe>

      <van-grid :column-num="3" :gutter="8" class="cats">
        <van-grid-item
          v-for="c in categories"
          :key="c.id"
          :icon="c.icon"
          :text="c.name"
          @click="router.push('/category')"
        />
      </van-grid>

      <div class="section-title">猜你喜欢</div>

      <van-list
        v-model:loading="listLoading"
        :finished="finished"
        finished-text="没有更多了"
        @load="onLoad"
      >
        <van-card
          v-for="p in products"
          :key="p.id"
          :title="p.title"
          :desc="p.description"
          :thumb="p.cover"
          :price="p.price"
          :origin-price="p.originalPrice"
          @click="goDetail(p.id)"
        >
          <template #tags>
            <van-tag plain type="danger" style="margin-right: 4px">
              热销
            </van-tag>
            <van-tag plain>已售 {{ p.sales }}</van-tag>
          </template>
          <template #bottom>
            <van-button size="mini" type="primary" @click.stop="goDetail(p.id)">
              查看详情
            </van-button>
          </template>
        </van-card>
      </van-list>
    </van-pull-refresh>
  </div>
</template>

<style scoped>
.home {
  background: #f7f8fa;
  min-height: 100vh;
}
.content {
  padding: 46px 0 60px;
}
.banner {
  margin: 12px;
  border-radius: 8px;
  overflow: hidden;
  height: 160px;
}
.banner :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.cats {
  background: #fff;
  padding: 12px 0;
  margin: 0 12px;
  border-radius: 8px;
}
.cats :deep(.van-grid-item__content) {
  background: transparent;
}
.cats :deep(.van-grid-item__icon) {
  font-size: 28px;
}
.section-title {
  margin: 20px 16px 8px;
  font-weight: 600;
  color: #323233;
}
</style>