<script setup lang="ts">
import { onActivated, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import {
  listMyRefunds,
  REFUND_STATUS_LABELS,
  type RefundRequest,
  type RefundStatus
} from '../api/refund'

const router = useRouter()
const loading = ref(false)
const list = ref<RefundRequest[]>([])
const total = ref(0)
const finished = ref(false)

const query = reactive({
  status: 0 as RefundStatus,
  page: 1,
  pageSize: 20
})

const tabs = [
  { name: 0, label: '待审' },
  { name: 1, label: '已批准' },
  { name: 2, label: '已拒绝' },
  { name: 3, label: '已退款' }
]

async function load(reset = true) {
  if (reset) {
    query.page = 1
    finished.value = false
    list.value = []
  }
  loading.value = true
  try {
    const r = await listMyRefunds({
      status: query.status,
      page: query.page,
      pageSize: query.pageSize
    })
    list.value = reset ? r.list : [...list.value, ...r.list]
    total.value = r.total
    if (!r.hasMore) finished.value = true
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '加载失败'
    showToast(msg)
  } finally {
    loading.value = false
  }
}

onMounted(load)
onActivated(load)

function onTabChange(s: number | string) {
  query.status = Number(s) as RefundStatus
  load(true)
}

function onLoadMore() {
  if (finished.value || loading.value) return
  query.page += 1
  load(false)
}

function openDetail(r: RefundRequest) {
  router.push({ name: 'refund-detail', query: { id: r.id } })
}

function fmtDate(s: string) {
  return new Date(s).toLocaleString()
}
</script>

<template>
  <div class="page">
    <van-nav-bar title="我的退款" left-arrow fixed @click-left="router.back()" />

    <div class="content">
      <van-tabs :model-value="query.status" sticky @change="onTabChange">
        <van-tab
          v-for="t in tabs"
          :key="t.name"
          :title="t.label"
          :name="t.name"
        />
      </van-tabs>

      <van-list
        v-model:loading="loading"
        :finished="finished"
        finished-text="没有更多了"
        @load="onLoadMore"
        :immediate-check="false"
      >
        <div v-if="list.length === 0 && !loading" class="empty">
          <van-empty description="暂无退款记录" />
        </div>
        <div v-else class="list">
          <div
            v-for="r in list"
            :key="r.id"
            class="refund-card"
            @click="openDetail(r)"
          >
            <div class="row top">
              <span class="label">退款单号</span>
              <span class="value">#{{ r.id }}</span>
              <van-tag :type="r.status === 3 ? 'success' : r.status === 2 ? 'default' : 'warning'">
                {{ REFUND_STATUS_LABELS[r.status] }}
              </van-tag>
            </div>
            <div class="row">
              <span class="label">关联订单</span>
              <span class="value">{{ r.order?.orderNo ?? '-' }}</span>
            </div>
            <div class="row">
              <span class="label">退款金额</span>
              <span class="amount">¥{{ r.amount.toFixed(2) }}</span>
            </div>
            <div class="row reason">
              <span class="label">原因</span>
              <span class="value muted">{{ r.reason }}</span>
            </div>
            <div class="row time">
              <span class="value muted">{{ fmtDate(r.createdAt) }}</span>
            </div>
          </div>
        </div>
      </van-list>
    </div>
  </div>
</template>

<style scoped>
.page { min-height: 100vh; background: #f7f8fa; }
.content { padding: 46px 0 24px; }
.empty { padding: 32px 0; }
.list {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.refund-card {
  background: #fff;
  border-radius: 10px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.row.top { justify-content: space-between; }
.row .label { color: #969799; min-width: 70px; }
.row .value { color: #323233; flex: 1; }
.row .value.muted { color: #969799; }
.row .amount { color: #ee0a24; font-weight: 600; font-size: 16px; }
.row.reason { align-items: flex-start; }
.row.reason .value {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.row.time { justify-content: flex-end; font-size: 12px; }
</style>
