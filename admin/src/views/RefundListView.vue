<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  listAdminRefunds,
  REFUND_STATUSES,
  REFUND_STATUS_LABELS,
  REFUND_STATUS_TAG_TYPE,
  type AdminRefundListItem,
  type RefundStatus
} from '../api/admin-refunds'

const router = useRouter()
const loading = ref(false)
const list = ref<AdminRefundListItem[]>([])
const total = ref(0)

const query = reactive({
  status: undefined as RefundStatus | undefined,
  keyword: '',
  page: 1,
  pageSize: 10
})

const tabs = [
  { label: '全部', value: undefined },
  ...REFUND_STATUSES.map((s) => ({ label: REFUND_STATUS_LABELS[s], value: s }))
]

async function load() {
  loading.value = true
  try {
    const r = await listAdminRefunds({
      status: query.status,
      keyword: query.keyword || undefined,
      page: query.page,
      pageSize: query.pageSize
    })
    list.value = r.list
    total.value = r.total
  } finally {
    loading.value = false
  }
}

onMounted(load)

function onTabChange() {
  query.page = 1
  load()
}

function onSearch() {
  query.page = 1
  load()
}

function onReset() {
  query.keyword = ''
  query.status = undefined
  query.page = 1
  load()
}

function openDetail(row: AdminRefundListItem) {
  router.push({ name: 'admin-refund-detail', params: { id: String(row.id) } })
}

function asRefund(row: unknown): AdminRefundListItem {
  return row as AdminRefundListItem
}
</script>

<template>
  <div class="page">
    <el-card>
      <el-tabs :model-value="String(query.status ?? '')" @tab-change="(name: string) => { query.status = name === '' ? undefined : (Number(name) as RefundStatus); onTabChange(); }">
        <el-tab-pane
          v-for="t in tabs"
          :key="String(t.value ?? '')"
          :label="t.label"
          :name="String(t.value ?? '')"
        />
      </el-tabs>

      <el-form :inline="true" :model="query" class="filter">
        <el-form-item label="搜索">
          <el-input
            v-model="query.keyword"
            placeholder="退款 ID / 订单 ID / 用户名"
            clearable
            style="width: 240px"
            @keyup.enter="onSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onSearch">查询</el-button>
          <el-button @click="onReset">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="loading" :data="list" stripe>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column label="订单号" min-width="180">
          <template #default="{ row }">
            {{ asRefund(row).order?.orderNo ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column label="用户" min-width="140">
          <template #default="{ row }">
            <template v-if="asRefund(row).order?.user">
              {{ asRefund(row).order!.user!.nickname ?? asRefund(row).order!.user!.username }}
              <span class="muted">@{{ asRefund(row).order!.user!.username }}</span>
            </template>
            <span v-else class="muted">-</span>
          </template>
        </el-table-column>
        <el-table-column label="退款金额" width="120">
          <template #default="{ row }">
            <span class="amount">¥{{ asRefund(row).amount.toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="原因" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            {{ asRefund(row).reason }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="REFUND_STATUS_TAG_TYPE[asRefund(row).status]">
              {{ REFUND_STATUS_LABELS[asRefund(row).status] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="申请时间" width="180">
          <template #default="{ row }">
            {{ new Date(asRefund(row).createdAt).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button v-permission="'refund:detail'" link type="primary" @click="openDetail(asRefund(row))">
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="query.page"
        v-model:page-size="query.pageSize"
        :page-sizes="[10, 20, 50]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        style="margin-top: 12px; justify-content: flex-end"
        @current-change="load"
        @size-change="load"
      />
    </el-card>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 12px; }
.filter { margin-bottom: 12px; }
.muted { color: #909399; font-size: 12px; margin-left: 4px; }
.amount { color: #f56c6c; font-weight: 600; }
</style>
