<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import {
  getProduct,
  type Product
} from '../api/product'
import { createOrder } from '../api/order'
import { useCartStore } from '../stores/cart'

const route = useRoute()
const router = useRouter()
const cart = useCartStore()

const items = ref<Product[]>([])
const loading = ref(true)
const submitting = ref(false)

const receiver = reactive({ name: '', phone: '', address: '' })
const remark = ref('')

// 支持直接 query  传  productId + quantity 用于"立即购买"跳过购物车
const directProductId = Number(route.query.productId)
const directQuantity = Number(route.query.quantity) || 1

async function load() {
  loading.value = true
  try {
    if (directProductId) {
      const p = await getProduct(directProductId)
      items.value = [p]
    } else {
      const lines = cart.selectedLines()
      if (lines.length === 0) {
        showToast('没有选中商品')
        router.replace('/cart')
        return
      }
      items.value = await Promise.all(
        lines.map((l) => getProduct(l.productId))
      )
    }
  } finally {
    loading.value = false
  }
}

onMounted(load)

const lines = computed(() => {
  if (directProductId) {
    return items.value.map((p) => ({ product: p, quantity: directQuantity }))
  }
  return items.value.map((p) => {
    const line = cart.items.find((it) => it.productId === p.id)
    return { product: p, quantity: line?.quantity ?? 1 }
  })
})

const totalPrice = computed(() =>
  lines.value.reduce((s, l) => s + l.product.price * l.quantity, 0).toFixed(2)
)

async function onSubmit() {
  if (!receiver.name.trim()) return showToast('请输入收货人姓名')
  if (!receiver.phone.trim()) return showToast('请输入手机号')
  if (!receiver.address.trim()) return showToast('请输入详细地址')

  submitting.value = true
  try {
    const order = await createOrder({
      items: lines.value.map((l) => ({
        productId: l.product.id,
        quantity: l.quantity
      })),
      receiver: {
        name: receiver.name.trim(),
        phone: receiver.phone.trim(),
        address: receiver.address.trim()
      },
      remark: remark.value.trim() || undefined
    })
    if (!directProductId) cart.clearSelected()
    showToast({ type: 'success', message: '下单成功' })
    router.replace({ name: 'order-success', query: { id: order.id } })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '下单失败'
    showToast(msg)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="confirm">
    <van-nav-bar title="确认订单" left-arrow fixed @click-left="router.back()" />

    <div class="content" v-if="!loading">
      <van-cell-group inset title="收货地址">
        <van-field v-model="receiver.name" label="姓名" placeholder="请输入" />
        <van-field
          v-model="receiver.phone"
          label="手机号"
          type="tel"
          placeholder="请输入"
        />
        <van-field
          v-model="receiver.address"
          label="详细地址"
          type="textarea"
          rows="2"
          autosize
          maxlength="200"
          placeholder="街道、楼栋、门牌号"
        />
      </van-cell-group>

      <van-cell-group inset title="商品清单" class="block">
        <van-card
          v-for="(l, i) in lines"
          :key="l.product.id"
          :title="l.product.title"
          :thumb="l.product.cover"
          :num="`×${l.quantity}`"
          :price="l.product.price"
        >
          <template #thumb>
            <img class="thumb" :src="l.product.cover" :alt="l.product.title" />
          </template>
        </van-card>
      </van-cell-group>

      <van-cell-group inset title="买家留言" class="block">
        <van-field
          v-model="remark"
          rows="2"
          autosize
          type="textarea"
          maxlength="200"
          show-word-limit
          placeholder="选填，建议留言前先与卖家协商一致"
        />
      </van-cell-group>
    </div>

    <van-submit-bar
      v-if="!loading"
      :price="Number(totalPrice) * 100"
      button-text="提交订单"
      :button-color="'#ee0a24'"
      :loading="submitting"
      @submit="onSubmit"
      safe-area-inset-bottom
    />
  </div>
</template>

<style scoped>
.confirm { min-height: 100vh; background: #f7f8fa; }
.content { padding: 46px 0 80px; }
.block { margin-top: 12px; }
.thumb {
  width: 80px;
  height: 80px;
  border-radius: 6px;
  object-fit: cover;
}
</style>
