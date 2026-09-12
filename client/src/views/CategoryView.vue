<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  listCategories,
  listProducts,
  type Category,
  type Product
} from '../api/product'

const router = useRouter()

const categories = ref<Category[]>([])
// 真正参与业务筛选的「分类主键」，先置 null，等列表回来再设。
const activeId = ref<number | null>(null)
// Vant <van-sidebar> 的 v-model 是 children 数组下标，不是分类主键。
// 用 computed 在「分类 id」与「侧边栏下标」之间做翻译：
//   get：当前选中分类在 categories 里的下标，用于高亮
//   set：用户点击第 N 项时，把下标翻译回真正的 categoryId
const activeIndex = computed<number>({
  get: () => {
    if (activeId.value == null) return 0
    const idx = categories.value.findIndex((c) => c.id === activeId.value)
    return idx < 0 ? 0 : idx
  },
  set: (idx) => {
    const c = categories.value[idx]
    if (c) activeId.value = c.id
  }
})
const products = ref<Product[]>([])
const loading = ref(false)
const finished = ref(false)
const page = ref(1)

async function loadCategories() {
  categories.value = await listCategories()
  if (categories.value.length > 0) activeId.value = categories.value[0].id
}

async function loadProducts(reset = false) {
  if (reset) {
    page.value = 1
    products.value = []
    finished.value = false
  }
  loading.value = true
  try {
    const res = await listProducts({
      categoryId: activeId.value ?? undefined,
      page: page.value,
      pageSize: 10
    })
    products.value.push(...res.list)
    if (!res.hasMore) finished.value = true
    else page.value += 1
  } finally {
    loading.value = false
  }
}

watch(activeId, () => loadProducts(true))

onMounted(async () => {
  await loadCategories()
  // loadCategories 会赋值 activeId，由上面的 watch 触发首次加载，无需再手动调一次
})

function goDetail(id: number) {
  router.push(`/product/${id}`)
}

function onLoad() {
  if (!finished.value) loadProducts()
}
</script>

<template>
  <div class="category">
    <van-nav-bar title="商品分类" fixed />

    <div class="content">
      <van-sidebar
        v-model="activeIndex"
        class="sidebar"
        active-color="#ee0a24"
      >
        <van-sidebar-item
          v-for="c in categories"
          :key="c.id"
          :title="c.name"
        />
      </van-sidebar>

      <div class="right">
        <van-list
          v-model:loading="loading"
          :finished="finished"
          finished-text="没有更多了"
          @load="onLoad"
          :immediate-check="false"
        >
          <van-card
            v-for="p in products"
            :key="p.id"
            :title="p.title"
            :desc="p.description ?? ''"
            :thumb="p.cover"
            :price="p.price"
            :origin-price="p.originalPrice"
            @click="goDetail(p.id)"
          >
            <template #tags>
              <van-tag plain>已售 {{ p.sales }}</van-tag>
            </template>
          </van-card>
        </van-list>
      </div>
    </div>
  </div>
</template>

<style scoped>
.category {
  min-height: 100vh;
  background: #fff;
}
.content {
  display: flex;
  padding-top: 46px;
  padding-bottom: 60px;
  min-height: calc(100vh - 46px);
}
.sidebar {
  width: 100px;
  flex-shrink: 0;
  background: #f7f8fa;
}
.right {
  flex: 1;
  padding: 8px;
  overflow-y: auto;
}
</style>
