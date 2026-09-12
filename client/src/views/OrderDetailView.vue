<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast, showConfirmDialog, showDialog } from 'vant'
import {
  getOrder,
  cancelOrder,
  confirmReceipt,
  type OrderDetail
} from '../api/order'
import { createRefund } from '../api/refund'
import {
  getCanReview,
  listMyReviews,
  type CanReviewResponse,
  type ReviewItem
} from '../api/review'
import { errorMessage } from '../api/request'

const route = useRoute()
const router = useRouter()
const order = ref<OrderDetail | null>(null)
const loading = ref(false)
const acting = ref(false)
const canReview = ref<CanReviewResponse | null>(null)
const myReviews = ref<ReviewItem[]>([])

const STATUS_LABELS: Record<number, string> = {
  0: '待付款',
  1: '待发货',
  2: '已发货',
  3: '已完成',
  4: '已取消'
}

const STATUS_TAG_TYPE: Record<number, 'primary' | 'success' | 'default' | 'warning'> = {
  0: 'warning',
  1: 'primary',
  2: 'success',
  3: 'default',
  4: 'default'
}

const REFUND_STATUS_LABELS: Record<number, string> = {
  0: '退款待审',
  1: '退款已批准',
  2: '退款已拒绝',
  3: '退款已完成'
}

async function load() {
  const id = Number(route.query.id)
  if (!id) {
    showToast('订单 id 缺失')
    router.replace({ name: 'order-list' })
    return
  }
  loading.value = true
  try {
    order.value = await getOrder(id)
    if (order.value && order.value.status === 3) {
      try {
        canReview.value = await getCanReview(id)
      } catch {
        canReview.value = null
      }
      try {
        const r = await listMyReviews({ pageSize: 50 })
        myReviews.value = r.list.filter(
          (rv) => rv.orderId === order.value!.id
        )
      } catch {
        myReviews.value = []
      }
    } else {
      canReview.value = null
      myReviews.value = []
    }
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function onCancel() {
  if (!order.value) return
  try {
    await showConfirmDialog({
      title: '确认取消订单',
      message: '取消后无法恢复，已使用的优惠券将退回'
    })
  } catch {
    return
  }
  acting.value = true
  try {
    order.value = await cancelOrder(order.value.id)
    showToast('已取消')
  } finally {
    acting.value = false
  }
}

async function onConfirmReceipt() {
  if (!order.value) return
  try {
    await showConfirmDialog({
      title: '确认收货',
      message: '请确认已收到货物'
    })
  } catch {
    return
  }
  acting.value = true
  try {
    order.value = await confirmReceipt(order.value.id)
    showToast('已确认收货')
  } finally {
    acting.value = false
  }
}

// 申请退款 Dialog
const refundVisible = ref(false)
const refundForm = reactive({
  amount: 0,
  reason: ''
})

const canRefund = computed(() => {
  if (!order.value) return false
  if (order.value.refund) return false
  return order.value.status === 2 || order.value.status === 3
})

function openRefund() {
  if (!order.value) return
  refundForm.amount = Number(order.value.totalAmount)
  refundForm.reason = ''
  refundVisible.value = true
}

async function submitRefund() {
  if (!order.value) return
  if (!refundForm.reason.trim()) {
    showToast('请填写退款原因')
    return
  }
  // van-field onMounted 会把 modelValue 用 String() 包一层再 emit 回来,
  // 所以 refundForm.amount 这里其实是字符串。统一 Number(...) 再做比较与 toFixed。
  const orderTotal = Number(order.value.totalAmount)
  const amount = Number(refundForm.amount)
  if (!Number.isFinite(amount) || amount <= 0 || amount > orderTotal) {
    showToast(`退款金额需在 0 ~ ¥${orderTotal.toFixed(2)} 之间`)
    return
  }
  acting.value = true
  try {
    await createRefund({
      orderId: order.value.id,
      reason: refundForm.reason.trim(),
      amount: Number(amount.toFixed(2))
    })
    showToast('已提交退款申请')
    refundVisible.value = false
    await load()
  } catch (e: unknown) {
    const msg = errorMessage(e, '提交失败')
    showToast(msg)
  } finally {
    acting.value = false
  }
}

function itemCanReview(productId: number): boolean {
  return (
    canReview.value?.items.some(
      (i) => i.productId === productId && i.canReview
    ) ?? false
  )
}

function myReviewForProduct(productId: number): ReviewItem | undefined {
  return myReviews.value.find((rv) => rv.productId === productId)
}

function stars(n: number): string {
  return '★★★★★☆☆☆☆☆'.slice(5 - n, 10 - n)
}

function goReview(item: { productId: number; productTitle: string }) {
  if (!order.value) return
  router.push({
    name: 'review-create',
    query: {
      orderId: order.value.id,
      productId: item.productId
    }
  })
}

function goRefundDetail() {
  if (!order.value?.refund) return
  router.push({ name: 'refund-detail', query: { id: order.value.refund.id } })
}
</script>

<template>
  <div class="detail">
    <van-nav-bar title="订单详情" left-arrow fixed @click-left="router.back()" />

    <div class="content">
      <div v-if="loading" class="loading-mask">
        <van-loading size="24">加载中...</van-loading>
      </div>
      <template v-if="order">
        <van-cell-group inset>
          <van-cell>
            <template #title>
              <van-tag :type="STATUS_TAG_TYPE[order.status]">
                {{ STATUS_LABELS[order.status] }}
              </van-tag>
              <span class="orderno">订单号：{{ order.orderNo }}</span>
            </template>
            <template #label>
              下单时间：{{ new Date(order.createdAt).toLocaleString() }}
            </template>
          </van-cell>
        </van-cell-group>

        <van-cell-group inset title="收货信息" class="block">
          <van-cell title="收货人" :value="order.receiver.name" />
          <van-cell title="手机号" :value="order.receiver.phone" />
          <van-cell title="详细地址" :value="order.receiver.address" />
        </van-cell-group>

        <van-cell-group inset title="商品列表" class="block">
          <template v-for="it in order.items" :key="it.id">
            <van-card
              :title="it.productTitle"
              :thumb="it.productCover"
              :num="`×${it.quantity}`"
              :price="it.price"
            />
            <div v-if="myReviewForProduct(it.productId)" class="my-review">
              <div class="my-review-head">
                <span class="my-review-label">你的评价</span>
                <span class="my-review-stars">
                  {{ stars(myReviewForProduct(it.productId)!.rating) }}
                </span>
                <span class="my-review-status" :class="`status-${myReviewForProduct(it.productId)!.status}`">
                  {{ ['', '已通过', '已屏蔽'][myReviewForProduct(it.productId)!.status] }}
                </span>
              </div>
              <div class="my-review-content">
                {{ myReviewForProduct(it.productId)!.content }}
              </div>
              <div v-if="myReviewForProduct(it.productId)!.reply" class="my-review-reply">
                <span class="reply-label">商家回复：</span>
                {{ myReviewForProduct(it.productId)!.reply }}
              </div>
              <div v-else-if="myReviewForProduct(it.productId)!.status === 1" class="my-review-pending">
                商家尚未回复
              </div>
            </div>
          </template>
        </van-cell-group>

        <van-cell-group inset title="支付 / 物流" class="block">
          <van-cell title="订单总额" :value="`¥${Number(order.totalAmount).toFixed(2)}`" />
          <van-cell
            v-if="order.coupon"
            title="优惠券"
            :value="`-¥${order.coupon.amount.toFixed(2)}（${order.coupon.name}）`"
          />
          <van-cell
            v-if="order.paidAt"
            title="付款时间"
            :value="new Date(order.paidAt).toLocaleString()"
          />
          <van-cell
            v-if="order.shippedAt"
            title="发货时间"
            :value="new Date(order.shippedAt).toLocaleString()"
          />
          <van-cell
            v-if="order.completedAt"
            title="完成时间"
            :value="new Date(order.completedAt).toLocaleString()"
          />
          <van-cell
            v-if="order.cancelledAt"
            title="取消时间"
            :value="new Date(order.cancelledAt).toLocaleString()"
          />
          <van-cell
            v-if="order.shipCompany"
            title="物流"
            :value="`${order.shipCompany} · ${order.shipNo}`"
          />
        </van-cell-group>

        <van-cell-group v-if="order.remark" inset title="买家留言" class="block">
          <van-cell :value="order.remark" />
        </van-cell-group>

        <van-cell-group v-if="order.refund" inset title="退款信息" class="block">
          <van-cell
            title="退款状态"
            :value="REFUND_STATUS_LABELS[order.refund.status] ?? '-'"
            is-link
            @click="goRefundDetail"
          />
          <van-cell title="退款金额" :value="`¥${Number(order.refund.amount).toFixed(2)}`" />
          <van-cell title="退款原因" :value="order.refund.reason" />
        </van-cell-group>

        <div class="actions">
          <van-button
            v-for="it in order.items"
            v-show="itemCanReview(it.productId)"
            :key="`r-${it.id}`"
            plain
            type="primary"
            @click="goReview(it)"
          >
            评价「{{ it.productTitle }}」
          </van-button>
          <van-button
            v-if="canRefund"
            plain
            type="warning"
            :loading="acting"
            @click="openRefund"
          >
            申请退款
          </van-button>
          <van-button
            v-if="order.status === 0 || order.status === 1"
            plain
            type="danger"
            :loading="acting"
            @click="onCancel"
          >
            取消订单
          </van-button>
          <van-button
            v-if="order.status === 2"
            type="primary"
            :loading="acting"
            @click="onConfirmReceipt"
          >
            确认收货
          </van-button>
        </div>
      </template>
    </div>

    <van-dialog
      v-model:show="refundVisible"
      title="申请退款"
      show-cancel-button
      :before-close="async (action: string) => {
        if (action === 'confirm') {
          await submitRefund()
          return false
        }
        return true
      }"
    >
      <div class="refund-form">
        <van-field
          v-model="refundForm.amount"
          type="number"
          label="退款金额"
          placeholder="0.00"
        />
        <van-field
          v-model="refundForm.reason"
          label="退款原因"
          type="textarea"
          rows="3"
          maxlength="500"
          show-word-limit
          placeholder="请描述退款原因"
        />
        <p class="refund-tip">订单实付 ¥{{ Number(order?.totalAmount ?? 0).toFixed(2) }}</p>
      </div>
    </van-dialog>
  </div>
</template>

<style scoped>
.detail { min-height: 100vh; background: #f7f8fa; }
.content { padding: 46px 0 32px; position: relative; }
.loading-mask {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(247, 248, 250, 0.85);
}

.orderno { margin-left: 12px; font-size: 13px; color: #606266; }
.block { margin-top: 12px; }
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px;
}
.refund-form { padding: 12px 0; }
.refund-tip {
  font-size: 12px;
  color: #969799;
  padding: 0 16px 8px;
  margin: 0;
}
.my-review {
  padding: 8px 16px 12px;
  border-top: 1px dashed #ebedf0;
  background: #fafbfc;
}
.my-review-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #606266;
}
.my-review-label {
  color: #1989fa;
  font-weight: 500;
}
.my-review-stars {
  color: #f7ba2e;
  letter-spacing: 1px;
}
.my-review-status {
  margin-left: auto;
  font-size: 12px;
  padding: 1px 6px;
  border-radius: 3px;
}
.status-0 {
  color: #f7ba2e;
  background: #fff5e6;
}
.status-1 {
  color: #67c23a;
  background: #e6f7e6;
}
.status-2 {
  color: #909399;
  background: #f0f1f2;
}
.my-review-content {
  margin-top: 6px;
  font-size: 14px;
  color: #303133;
  line-height: 1.5;
  white-space: pre-wrap;
}
.my-review-reply {
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
.my-review-pending {
  margin-top: 8px;
  font-size: 12px;
  color: #969799;
}
</style>