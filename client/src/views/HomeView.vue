<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { listBanners, type Banner } from '../api/banner'
import {
  listCategories,
  listProducts,
  type Category,
  type Product
} from '../api/product'

const router = useRouter()

const banners = ref<Banner[]>([])
const categories = ref<Category[]>([])
const products = ref<Product[]>([])
const refreshing = ref(false)
const listLoading = ref(false)
const finished = ref(false)
const page = ref(1)

async function loadBanners() {
  banners.value = await listBanners()
}

async function loadCategories() {
  categories.value = await listCategories()
}

async function loadProducts() {
  const res = await listProducts({ page: page.value, pageSize: 10 })
  products.value.push(...res.list)
  if (!res.hasMore) finished.value = true
  else page.value += 1
}

async function onRefresh() {
  await Promise.all([loadBanners(), loadCategories()])
  page.value = 1
  products.value = []
  finished.value = false
  await loadProducts()
  refreshing.value = false
}

async function init() {
  await Promise.all([loadBanners(), loadCategories()])
  await loadProducts()
}

onMounted(init)
</script>

<template>
  <div class="home">
    <van-nav-bar title="我的商城" fixed />

    <van-swipe :autoplay="4000" indicator-color="white" class="banner">
      <van-swipe-item v-for="b in banners" :key="b.id">
        <img :src="b.image" :alt="`banner-${b.id}`" class="banner-img" />
      </van-swipe-item>
    </van-swipe>

    <van-grid :column-num="3" class="cats" :border="false">
      <van-grid-item
        v-for="c in categories"
        :key="c.id"
        :icon="c.icon ?? ''"
        :text="c.name"
        @click="router.push({ path: '/category', query: { id: c.id } })"
      />
    </van-grid>

    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list
        v-model:loading="listLoading"
        :finished="finished"
        finished-text="没有更多了"
        @load="loadProducts"
      >
        <van-card
          v-for="p in products"
          :key="p.id"
          :title="p.title"
          :desc="`已售 ${p.sales} · 库存 ${p.stock}`"
          :thumb="p.cover"
          :price="p.price"
          @click="router.push(`/product/${p.id}`)"
        />
      </van-list>
    </van-pull-refresh>
  </div>
</template>

<style scoped>
.home {
  min-height: 100vh;
  background: #f7f8fa;
  padding-top: 46px;
  padding-bottom: 60px;
}
.banner-img {
  width: 100%;
  height: 180px;
  object-fit: cover;
}
.cats {
  background: #fff;
  margin-bottom: 8px;
}
</style>
