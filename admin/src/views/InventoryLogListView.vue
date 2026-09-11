<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  listAdminInventoryLogs,
  INVENTORY_TYPES,
  INVENTORY_TYPE_LABELS,
  INVENTORY_TYPE_TAG_TYPE,
  type AdminInventoryLogItem,
  type InventoryType
} from '../api/admin-inventory'
import { exportInventoryLogs } from '../api/admin-exports'

const loading = ref(false)
const list = ref<AdminInventoryLogItem[]>([])
const total = ref(0)

const query = reactive({
  type: undefined as InventoryType | undefined,
  keyword: '',
  page: 1,
  pageSize: 20
})

const tabs = [
  { label: '全部', value: undefined },
  ...INVENTORY_TYPES.map((t) => ({ label: INVENTORY_TYPE_LABELS[t], value: t }))
]

async function load() {
  loading.value = true
  try {
    const r = await listAdminInventoryLogs({
      type: query.type,
      keyword: query.keyword || undefined,
      page: query.page,
      pageSize: query.pageSize
    })
    list.value = r.list
    total.value = r.total
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '加载失败'
    ElMessage.error(msg)
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
  query.type = undefined
  query.page = 1
  load()
}

// 导出
const exportVisible = ref(false)
const exportForm = reactive({
  type: undefined as InventoryType | undefined,
  keyword: '',
  dateFrom: '',
  dateTo: ''
})
const exporting = ref(false)

function openExport() {
  exportForm.type = query.type
  exportForm.keyword = query.keyword
  exportForm.dateFrom = ''
  exportForm.dateTo = ''
  exportVisible.value = true
}

async function submitExport() {
  exporting.value = true
  try {
    await exportInventoryLogs({
      type: exportForm.type,
      keyword: exportForm.keyword || undefined,
      dateFrom: exportForm.dateFrom || undefined,
      dateTo: exportForm.dateTo || undefined
    })
    ElMessage.success('已下载')
    exportVisible.value = false
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '导出失败'
    ElMessage.error(msg)
  } finally {
    exporting.value = false
  }
}

function fmtQty(q: number): string {
  if (q > 0) return '+' + q
  return String(q)
}

function asLog(row: unknown): AdminInventoryLogItem {
  return row as AdminInventoryLogItem
}

const activeType = computed(() => String(query.type ?? ''))
</script>

<template>
  <div class="page">
    <el-card>
      <el-tabs :model-value="activeType" @tab-change="(name: string) => { query.type = name === '' ? undefined : (Number(name) as InventoryType); onTabChange(); }">
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
            placeholder="商品标题"
            clearable
            style="width: 240px"
            @keyup.enter="onSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onSearch">查询</el-button>
          <el-button @click="onReset">重置</el-button>
          <el-button v-permission="'export:inventory_logs'" type="success" plain @click="openExport">
            导出 Excel
          </el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="loading" :data="list" stripe>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column label="商品" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="product-cell">
              <el-image
                :src="asLog(row).product.cover"
                style="width: 40px; height: 40px; border-radius: 4px; flex: 0 0 40px"
                fit="cover"
              />
              <span class="product-title">{{ asLog(row).product.title }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="110">
          <template #default="{ row }">
            <el-tag :type="INVENTORY_TYPE_TAG_TYPE[asLog(row).type]">
              {{ INVENTORY_TYPE_LABELS[asLog(row).type] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="变更数量" width="110">
          <template #default="{ row }">
            <span :class="asLog(row).quantity > 0 ? 'qty-up' : 'qty-down'">
              {{ fmtQty(asLog(row).quantity) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="变更前 / 后" width="160">
          <template #default="{ row }">
            <span class="muted">{{ asLog(row).beforeStock }}</span>
            <span class="muted"> → </span>
            <span>{{ asLog(row).afterStock }}</span>
          </template>
        </el-table-column>
        <el-table-column label="原因" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="asLog(row).reason">{{ asLog(row).reason }}</span>
            <span v-else class="muted">-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作人" width="140">
          <template #default="{ row }">
            <template v-if="asLog(row).operator">
              {{ asLog(row).operator!.nickname ?? asLog(row).operator!.username }}
            </template>
            <span v-else class="muted">系统</span>
          </template>
        </el-table-column>
        <el-table-column label="时间" width="180">
          <template #default="{ row }">
            {{ new Date(asLog(row).createdAt).toLocaleString() }}
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

    <!-- 导出 Dialog -->
    <el-dialog v-model="exportVisible" title="导出库存流水" width="480px">
      <el-form label-width="80px">
        <el-form-item label="流水类型">
          <el-select v-model="exportForm.type" placeholder="全部" clearable style="width: 100%">
            <el-option v-for="t in INVENTORY_TYPES" :key="t" :label="INVENTORY_TYPE_LABELS[t]" :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键字">
          <el-input v-model="exportForm.keyword" placeholder="商品标题" clearable />
        </el-form-item>
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="exportForm.dateFrom"
            type="date"
            placeholder="起始日"
            value-format="YYYY-MM-DD"
            style="width: 48%"
          />
          <span style="margin: 0 4px">至</span>
          <el-date-picker
            v-model="exportForm.dateTo"
            type="date"
            placeholder="结束日"
            value-format="YYYY-MM-DD"
            style="width: 48%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="exportVisible = false">取消</el-button>
        <el-button type="primary" :loading="exporting" @click="submitExport">导出</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 12px; }
.filter { margin-bottom: 12px; }
.muted { color: #909399; font-size: 12px; }
.qty-up { color: #67c23a; font-weight: 600; }
.qty-down { color: #f56c6c; font-weight: 600; }
.product-cell { display: flex; align-items: center; gap: 8px; }
.product-title { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>
