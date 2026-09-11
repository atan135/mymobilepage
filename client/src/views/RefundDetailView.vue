<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import {
  getMyRefund,
  REFUND_STATUS_LABELS,
  type RefundDetail
} from '../api/refund'

const route = useRoute()
const router = useRouter()
const detail = ref<RefundDetail | null>(null)
const loading = ref(false)

async function load() {
  const id = Number(route.query.id)
  if (!id) {
    showToast('退款 id 缺失')
    router.replace({ name: 'refund-list' })
    return
  }
  loading.value = true
  try {
    detail.value = await getMyRefund(id)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '加载失败'
    showToast(msg)
  } finally {
    loading.value = false
  }
}

onMounted(load)

function fmtDate(s: string | null) {
  return s ? new Date(s).toLocaleString() : '-'
}

function statusType(s: number): 'success' | 'default' | 'warning' | 'primary' {
  if (s === 3) return 'success'
  if (s === 2) return 'default'
  if (s === 1) return 'primary'
  return 'warning'
}
</script>

<template>
  <div class="page">
    <van-nav-bar title="退款详情" left-arrow fixed @click-left="router.back()" />

    <div class="content" v-loading="loading">
      <template v-if="detail">
        <van-cell-group inset>
          <van-cell>
            <template #title>
              <van-tag :type="statusType(detail.status)" size="medium">
                {{ REFUND_STATUS_LABELS[detail.status] }}
              </van-tag>
              <span class="label">退款单号 #{{ detail.id }}</span>
            </template>
          </van-cell>
          <van-cell title="退款金额">
            <span class="amount">¥{{ detail.amount.toFixed(2) }}</span>
          </van-cell>
          <van-cell title="退款原因" :value="detail.reason" />
          <van-cell v-if="detail.remark" title="备注" :value="detail.remark" />
          <van-cell title="申请时间" :value="fmtDate(detail.createdAt)" />
          <van-cell v-if="detail.updatedAt !== detail.createdAt" title="处理时间" :value="fmtDate(detail.updatedAt)" />
        </van-cell-group>

        <van-cell-group v-if="detail.order" inset title="关联订单" class="block">
          <van-cell
            title="订单号"
            :value="detail.order.orderNo"
            is-link
            @click="router.push({ name: 'order-detail', query: { id: detail.order!.id } })"
          />
          <van-cell title="订单总额" :value="`¥${detail.order.totalAmount.toFixed(2)}`" />
          <van-cell v-if="detail.order.coupon" title="使用优惠券">
            {{ detail.order.coupon.name }}（优惠 ¥{{ detail.order.coupon.amount.toFixed(2) }}）
          </van-cell>
        </van-cell-group>

        <van-cell-group v-if="detail.order?.items?.length" inset title="退款商品" class="block">
          <van-card
            v-for="it in detail.order.items"
            :key="it.id"
            :title="it.productTitle"
            :thumb="it.productCover"
            :num="`×${it.quantity}`"
            :price="it.price"
          />
        </van-cell-group>

        <div class="tip">
          <template v-if="detail.status === 0">
            退款申请已提交，等待商家审核。审核通过后会再进行退款处理。
          </template>
          <template v-else-if="detail.status === 1">
            退款已批准，等待财务处理。处理完成后优惠券将一并退回。
          </template>
          <template v-else-if="detail.status === 2">
            退款已被拒绝，如有疑问请联系客服。
          </template>
          <template v-else-if="detail.status === 3">
            退款已完成，款项已按原支付路径退回，关联优惠券已恢复。
          </template>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.page { min-height: 100vh; background: #f7f8fa; }
.content { padding: 46px 0 24px; }
.label { margin-left: 8px; font-size: 13px; color: #606266; }
.amount { color: #ee0a24; font-weight: 700; font-size: 18px; }
.block { margin-top: 12px; }
.tip {
  margin: 16px;
  padding: 12px 16px;
  background: #fff7e8;
  color: #ee8a3c;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.6;
}
</style>
