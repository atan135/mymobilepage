<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import {
  getOrder,
  cancelOrder,
  confirmReceipt,
  type OrderDetail
} from '../api/order'

const route = useRoute()
const router = useRouter()
const order = ref<OrderDetail | null>(null)
const loading = ref(false)
const acting = ref(false)

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
      message: '取消后将自动退款（演示版不实际退款）'
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
      message: '请确认已收到货物后再确认后'
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
</script>

<template>
  <div class="detail">
    <van-nav-bar title="订单详情" left-arrow fixed @click-left="router.back()" />

    <div class="content" v-loading="loading">
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
          <van-card
            v-for="it in order.items"
            :key="it.id"
            :title="it.productTitle"
            :thumb="it.productCover"
            :num="`×${it.quantity}`"
            :price="it.price"
          />
        </van-cell-group>

        <van-cell-group inset title="支付 / 物流" class="block">
          <van-cell title="订单总额" :value="`¥${Number(order.totalAmount).toFixed(2)}`" />
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

        <div class="actions">
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
  </div>
</template>

<style scoped>
.detail { min-height: 100vh; background: #f7f8fa; }
.content { padding: 46px 0 32px; }
.orderno { margin-left: 12px; font-size: 13px; color: #606266; }
.block { margin-top: 12px; }
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px;
}
</style>
