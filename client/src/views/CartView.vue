<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import { getProduct, type Product } from '../api/product'
import { useCartStore } from '../stores/cart'
import { errorMessage } from '../api/request'

const router = useRouter()
const cart = useCartStore()

interface Row {
  product: Product
  quantity: number
  selected: boolean
}

const rows = ref<Row[]>([])
const loading = ref(false)

async function hydrate() {
  loading.value = true
  try {
    const products = await Promise.all(
      cart.items.map((it) => getProduct(it.productId))
    )
    rows.value = cart.items.map((it, i) => ({
      product: products[i],
      quantity: it.quantity,
      selected: it.selected
    }))
  } catch (e: unknown) {
    const msg = errorMessage(e, '加载购物车失败')
    showToast(msg)
  } finally {
    loading.value = false
  }
}

onMounted(hydrate)
watch(
  () => cart.items.length,
  () => hydrate()
)

const allChecked = computed({
  get: () =>
    rows.value.length > 0 && rows.value.every((r) => r.selected),
  set: (val: boolean) => {
    rows.value.forEach((r) => {
      r.selected = val
    })
    rows.value.forEach((r) => {
      const it = cart.items.find((x) => x.productId === r.product.id)
      if (it) it.selected = val
    })
  }
})

const totalPrice = computed(() =>
  rows.value
    .filter((r) => r.selected)
    .reduce((sum, r) => sum + r.product.price * r.quantity, 0)
    .toFixed(2)
)

function inc(row: Row) {
  const next = row.quantity + 1
  row.quantity = next
  cart.setQuantity(row.product.id, next)
}

function dec(row: Row) {
  if (row.quantity <= 1) return
  const next = row.quantity - 1
  row.quantity = next
  cart.setQuantity(row.product.id, next)
}

async function removeRow(row: Row) {
  try {
    await showConfirmDialog({ title: '确认删除该商品？' })
  } catch {
    return
  }
  cart.remove(row.product.id)
  showToast('已删除')
}

function checkout() {
  if (rows.value.filter((r) => r.selected).length === 0) {
    showToast('请先选择商品')
    return
  }
  router.push('/order/confirm')
}
</script>

<template>
  <div class="cart">
    <van-nav-bar title="购物车" left-arrow fixed @click-left="router.back()" />

    <div class="content" v-if="!loading">
      <van-empty
        v-if="rows.length === 0"
        description="购物车空空如也，去首页逛逛吧"
      />

      <template v-else>
        <van-card
          v-for="r in rows"
          :key="r.product.id"
          :title="r.product.title"
          :desc="`库存 ${r.product.stock} · 已售 ${r.product.sales}`"
          :thumb="r.product.cover"
          :price="r.product.price"
        >
          <template #thumb>
            <van-checkbox v-model="r.selected" />
            <img class="thumb-img" :src="r.product.cover" :alt="r.product.title" />
          </template>
          <template #num>
            <van-stepper
              :model-value="r.quantity"
              :min="1"
              :max="Math.max(1, r.product.stock)"
              @plus="inc(r)"
              @minus="dec(r)"
            />
          </template>
          <template #bottom>
            <van-button
              size="mini"
              type="danger"
              plain
              @click="removeRow(r)"
            >
              删除
            </van-button>
          </template>
        </van-card>
      </template>
    </div>

    <van-submit-bar
      v-if="rows.length > 0"
      :price="Number(totalPrice) * 100"
      button-text="结算"
      @submit="checkout"
      safe-area-inset-bottom
    >
      <van-checkbox v-model="allChecked">全选</van-checkbox>
    </van-submit-bar>
  </div>
</template>

<style scoped>
.cart {
  min-height: 100vh;
  background: #f7f8fa;
}
.content {
  padding: 46px 0 60px;
  min-height: calc(100vh - 46px);
}
.thumb-img {
  width: 80px;
  height: 80px;
  border-radius: 6px;
  object-fit: cover;
  margin-left: 8px;
}
</style>