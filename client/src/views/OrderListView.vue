<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import {
  listMyOrders,
  cancelOrder,
  type OrderListItem
} from '../api/order'

const router = useRouter()

const loading = ref(false)
const list = ref<OrderListItem[]>([])
const total = ref(0)

const query = reactive<{ status?: number; page: number; pageSize: number }>({
  status: undefined,
  page: 1,
  pageSize: 10
})

const tabs = [
  { label: '全部', value: undefined as number | undefined },
  { label: '待付款', value: 0 },
  { label: '待发货', value: 1 },
  { label: '已发货', value: 2 },
  { label: '已完成', value: 3 },
  { label: '已取消', value: 4 }
]

const STATUS_LABELS: Record<number, string> = {
  0: '待付款',
  1: '待发货',
  2: '已发货',
  3: '已完成',
  4: '已取消'
}

async function load() {
  loading.value = true
  try {
    const res = await listMyOrders({ ...query })
    list.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

onMounted(load)

function onTabChange() {
  query.page = 1
  load()
}

const hasMore = computed(() => query.page * query.pageSize < total.value)

async function loadMore() {
  if (!hasMore.value || loading.value) return
  query.page += 1
  loading.value = true
  try {
    const res = await listMyOrders({ ...query })
    list.value.push(...res.list)
    total.value = res.total
  } finally {
    loading.value = false
  }
}

function goDetail(row: OrderListItem) {
  router.push({ name: 'order-detail', query: { id: row.id } })
}

async function onCancel(row: OrderListItem) {
  try {
    await showConfirmDialog({
      title: '确认取消订单',
      message: `订单 ${row.orderNo} 取消后将自动退款（演示版不实际退款）`
    })
  } catch {
    return
  }
  try {
    await cancelOrder(row.id)
    showToast('已取消')
    load()
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '取消失败'
    showToast(msg)
  }
}
</script>

<template>
  <div class="orders">
    <van-nav-bar title="我的订单" left-arrow fixed @click-left="router.back()" />

    <div class="content">
      <van-tabs v-model:active="query.status" @change="onTabChange" sticky>
        <van-tab
          v-for="t in tabs"
          :key="String(t.value)"
          :title="t.label"
          :name="t.value"
        />
      </van-tabs>

      <van-empty v-if="!loading && list.length === 0" description="暂无订单" />

      <van-list
        v-else
        v-model:loading="loading"
        :finished="!hasMore"
        finished-text="没有更多了"
        @load="loadMore"
      >
        <van-card
          v-for="row in list"
          :key="row.id"
          :title="row.orderNo"
          :desc="`共 ${row.itemCount} 件 · ¥${Number(row.totalAmount).toFixed(2)}`"
          :thumb="''"
          class="order-card"
          @click="goDetail(row)"
        >
          <template #tags>
            <van-tag :type="row.status === 1 ? 'primary' : row.status === 4 ? 'default' : 'success'">
              {{ STATUS_LABELS[row.status] }}
            </van-tag>
          </template>
          <template #num>
            <span class="time">{{ new Date(row.createdAt).toLocaleString() }}</span>
          </template>
          <template #bottom>
            <van-button
              v-if="row.status === 0 || row.status === 1"
              size="mini"
              plain
              type="danger"
              @click.stop="onCancel(row)"
            >
              取消订单
            </van-button>
            <van-button size="mini" plain type="primary" @click.stop="goDetail(row)">
              查看详情
            </van-button>
          </template>
        </van-card>
      </van-list>
    </div>
  </div>
</template>

<style scoped>
.orders { min-height: 100vh; background: #f7f8fa; }
.content { padding: 46px 0 16px; }
.order-card {
  background: #fff;
  margin: 8px 16px;
  border-radius: 8px;
  padding: 12px 0;
}
.time { font-size: 12px; color: #969799; }
</style>
