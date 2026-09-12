<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import type { ActionSheetAction } from 'vant'
import {
  getProduct,
  type Product
} from '../api/product'
import { createOrder } from '../api/order'
import { useCartStore } from '../stores/cart'
import {
  listMyCoupons,
  previewCoupon,
  type UserCoupon
} from '../api/coupon'
import { errorMessage } from '../api/request'

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

const originalAmount = computed(() =>
  Number(
    lines.value
      .reduce((s, l) => s + l.product.price * l.quantity, 0)
      .toFixed(2)
  )
)

// 优惠券：可选一张「未使用」的
const selectedCouponId = ref<number | null>(null)
const selectedCouponName = ref('')
const discountAmount = ref(0)
const availableCoupons = ref<UserCoupon[]>([])
const couponLoading = ref(false)
const showCouponSheet = ref(false)
const couponSheetActions = ref<ActionSheetAction[]>([])
let previewSeq = 0

async function loadAvailableCoupons() {
  couponLoading.value = true
  try {
    const r = await listMyCoupons({ status: 0, page: 1, pageSize: 50 })
    availableCoupons.value = r.list
  } catch {
    availableCoupons.value = []
  } finally {
    couponLoading.value = false
  }
}

async function refreshPreview() {
  const seq = ++previewSeq
  if (selectedCouponId.value === null) {
    discountAmount.value = 0
    return
  }
  try {
    const r = await previewCoupon({
      items: lines.value.map((l) => ({
        productId: l.product.id,
        quantity: l.quantity
      })),
      couponId: selectedCouponId.value
    })
    if (seq !== previewSeq) return
    discountAmount.value = Number(r.discountAmount)
  } catch (e: unknown) {
    if (seq !== previewSeq) return
    const msg = errorMessage(e, '优惠券不可用')
    showToast(msg)
    selectedCouponId.value = null
    selectedCouponName.value = ''
    discountAmount.value = 0
  }
}

watch(originalAmount, refreshPreview)
watch(selectedCouponId, refreshPreview)

async function onPickCoupon() {
  if (availableCoupons.value.length === 0) await loadAvailableCoupons()
  couponSheetActions.value = [
    ...availableCoupons.value.map<ActionSheetAction>((uc) => ({
      name: `${uc.coupon.name}（${formatCouponLabel(uc)}）`,
      subname: uc.expiresAt ? `至 ${new Date(uc.expiresAt).toLocaleDateString()} 过期` : ''
    })),
    { name: '不使用优惠券' }
  ]
  showCouponSheet.value = true
}

function onCouponSelect(_action: ActionSheetAction, index: number) {
  showCouponSheet.value = false
  if (index === availableCoupons.value.length) {
    selectedCouponId.value = null
    selectedCouponName.value = ''
    return
  }
  const uc = availableCoupons.value[index]
  selectedCouponId.value = uc.id
  selectedCouponName.value = uc.coupon.name
}

function formatCouponLabel(uc: UserCoupon): string {
  const c = uc.coupon
  if (c.type === 1) return `满${c.threshold ?? 0}减${c.amount}`
  if (c.type === 2) return `${c.amount}% 折扣`
  return `¥${c.amount} 代金`
}

const totalPrice = computed(() =>
  Math.max(0, originalAmount.value - discountAmount.value).toFixed(2)
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
      remark: remark.value.trim() || undefined,
      couponId: selectedCouponId.value ?? undefined
    })
    if (!directProductId) cart.clearSelected()
    showToast({ type: 'success', message: '下单成功' })
    router.replace({ name: 'order-success', query: { id: order.id } })
  } catch (e: unknown) {
    const msg = errorMessage(e, '下单失败')
    showToast(msg)
  } finally {
    submitting.value = false
  }
}

onMounted(loadAvailableCoupons)
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

      <van-cell-group inset title="优惠券" class="block">
        <van-cell
          :title="selectedCouponId === null ? '不使用优惠券' : selectedCouponName"
          :label="
            selectedCouponId === null
              ? (couponLoading ? '加载中...' : `${availableCoupons.length} 张可用`)
              : `已优惠 ¥${discountAmount.toFixed(2)}`
          "
          is-link
          @click="onPickCoupon"
        />
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

      <van-cell-group inset title="费用明细" class="block">
        <van-cell title="商品总额" :value="`¥${originalAmount.toFixed(2)}`" />
        <van-cell
          v-if="discountAmount > 0"
          title="优惠券"
          :value="`-¥${discountAmount.toFixed(2)}`"
          value-class="discount-value"
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

    <van-action-sheet
      v-model:show="showCouponSheet"
      :actions="couponSheetActions"
      title="选择优惠券"
      cancel-text="取消"
      close-on-click-action
      @select="onCouponSelect"
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
:deep(.discount-value) {
  color: #ee0a24 !important;
}
</style>
