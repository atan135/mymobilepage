<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import { getCart } from '../api/product'
import type { CartItem } from '../mock/data'

const items = ref<CartItem[]>([])
const checked = ref<boolean[]>([])
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    items.value = await getCart()
    checked.value = items.value.map((it) => it.selected)
  } finally {
    loading.value = false
  }
}

onMounted(load)

const allChecked = computed({
  get: () =>
    checked.value.length > 0 && checked.value.every((v) => v),
  set: (val: boolean) => {
    checked.value = items.value.map(() => val)
  }
})

const totalPrice = computed(() =>
  items.value
    .filter((_, i) => checked.value[i])
    .reduce((sum, it) => sum + it.product.price * it.quantity, 0)
    .toFixed(2)
)

function inc(i: number) {
  items.value[i].quantity += 1
}
function dec(i: number) {
  if (items.value[i].quantity > 1) items.value[i].quantity -= 1
}

async function removeItem(i: number) {
  try {
    await showConfirmDialog({ title: '确认删除该商品？' })
    items.value.splice(i, 1)
    checked.value.splice(i, 1)
    showToast('已删除')
  } catch {
    /* cancelled */
  }
}

function checkout() {
  if (items.value.filter((_, i) => checked.value[i]).length === 0) {
    showToast('请先选择商品')
    return
  }
  showToast(`已下单，合计 ¥${totalPrice.value}`)
}
</script>

<template>
  <div class="cart">
    <van-nav-bar title="购物车" fixed />

    <div class="content" v-if="!loading">
      <van-empty
        v-if="items.length === 0"
        description="购物车空空如也，去首页逛逛吧"
      />

      <template v-else>
        <van-card
          v-for="(it, i) in items"
          :key="it.productId"
          :title="it.product.title"
          :desc="`已售 ${it.product.sales}`"
          :thumb="it.product.cover"
          :price="it.product.price"
        >
          <template #thumb>
            <van-checkbox v-model="checked[i]" />
            <img class="thumb-img" :src="it.product.cover" />
          </template>
          <template #num>
            <van-stepper
              v-model="items[i].quantity"
              :min="1"
              :max="99"
              @change="inc(i)"
            />
          </template>
          <template #bottom>
            <van-button
              size="mini"
              type="danger"
              plain
              @click="removeItem(i)"
            >
              删除
            </van-button>
          </template>
        </van-card>
      </template>
    </div>

    <van-submit-bar
      v-if="items.length > 0"
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