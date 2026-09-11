<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  listAdminAuditLogs,
  type AdminAuditLogItem
} from '../api/admin-audit-logs'

const loading = ref(false)
const list = ref<AdminAuditLogItem[]>([])
const total = ref(0)

const query = reactive({
  adminId: undefined as number | undefined,
  resource: '',
  action: '',
  dateFrom: '',
  dateTo: '',
  page: 1,
  pageSize: 20
})

async function load() {
  loading.value = true
  try {
    const r = await listAdminAuditLogs({
      adminId: query.adminId,
      resource: query.resource || undefined,
      action: query.action || undefined,
      dateFrom: query.dateFrom || undefined,
      dateTo: query.dateTo || undefined,
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

function onSearch() {
  query.page = 1
  load()
}

function onReset() {
  query.adminId = undefined
  query.resource = ''
  query.action = ''
  query.dateFrom = ''
  query.dateTo = ''
  query.page = 1
  load()
}

function actionTagType(action: string): 'success' | 'warning' | 'info' | 'primary' | 'danger' {
  if (action.endsWith('_failed')) return 'danger'
  if (action === 'delete') return 'danger'
  if (action === 'create') return 'success'
  if (action === 'update') return 'primary'
  if (action === 'login') return 'info'
  return 'warning'
}

// 详情 Dialog
const detailVisible = ref(false)
const detail = ref<AdminAuditLogItem | null>(null)

function openDetail(row: AdminAuditLogItem) {
  detail.value = row
  detailVisible.value = true
}

function asLog(row: unknown): AdminAuditLogItem {
  return row as AdminAuditLogItem
}

function fmtJson(v: unknown): string {
  if (v === null || v === undefined) return ''
  try {
    return JSON.stringify(v, null, 2)
  } catch {
    return String(v)
  }
}
</script>

<template>
  <div class="page">
    <el-card>
      <el-form :inline="true" :model="query" class="filter">
        <el-form-item label="操作人 ID">
          <el-input v-model.number="query.adminId" placeholder="按 adminId 查" clearable style="width: 130px" @keyup.enter="onSearch" />
        </el-form-item>
        <el-form-item label="资源">
          <el-input v-model="query.resource" placeholder="products / orders / ..." clearable style="width: 150px" @keyup.enter="onSearch" />
        </el-form-item>
        <el-form-item label="动作">
          <el-input v-model="query.action" placeholder="create / update / approve" clearable style="width: 150px" @keyup.enter="onSearch" />
        </el-form-item>
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="query.dateFrom"
            type="date"
            placeholder="起始日"
            value-format="YYYY-MM-DD"
            style="width: 140px"
          />
          <span style="margin: 0 4px">至</span>
          <el-date-picker
            v-model="query.dateTo"
            type="date"
            placeholder="结束日"
            value-format="YYYY-MM-DD"
            style="width: 140px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onSearch">查询</el-button>
          <el-button @click="onReset">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="loading" :data="list" stripe>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column label="时间" width="170">
          <template #default="{ row }">
            {{ new Date(asLog(row).createdAt).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column label="操作人" width="140">
          <template #default="{ row }">
            <template v-if="asLog(row).admin">
              {{ asLog(row).admin!.nickname ?? asLog(row).admin!.username }}
              <span class="muted">#{{ asLog(row).admin!.id }}</span>
            </template>
            <span v-else class="muted">系统</span>
          </template>
        </el-table-column>
        <el-table-column label="资源" width="120">
          <template #default="{ row }">
            {{ asLog(row).resource }}
          </template>
        </el-table-column>
        <el-table-column label="动作" width="110">
          <template #default="{ row }">
            <el-tag :type="actionTagType(asLog(row).action)">
              {{ asLog(row).action }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="目标 ID" width="90">
          <template #default="{ row }">
            <span v-if="asLog(row).resourceId">#{{ asLog(row).resourceId }}</span>
            <span v-else class="muted">-</span>
          </template>
        </el-table-column>
        <el-table-column label="IP" width="130">
          <template #default="{ row }">
            <span v-if="asLog(row).ip">{{ asLog(row).ip }}</span>
            <span v-else class="muted">-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(asLog(row))">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="query.page"
        v-model:page-size="query.pageSize"
        :page-sizes="[20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        style="margin-top: 12px; justify-content: flex-end"
        @current-change="load"
        @size-change="load"
      />
    </el-card>

    <!-- 详情 Dialog -->
    <el-dialog v-model="detailVisible" title="操作日志详情" width="640px">
      <el-descriptions v-if="detail" :column="2" border>
        <el-descriptions-item label="日志 ID">{{ detail.id }}</el-descriptions-item>
        <el-descriptions-item label="时间">{{ new Date(detail.createdAt).toLocaleString() }}</el-descriptions-item>
        <el-descriptions-item label="操作人">
          <template v-if="detail.admin">
            {{ detail.admin.nickname ?? detail.admin.username }} <span class="muted">#{{ detail.admin.id }}</span>
          </template>
          <span v-else>系统</span>
        </el-descriptions-item>
        <el-descriptions-item label="IP">{{ detail.ip ?? '-' }}</el-descriptions-item>
        <el-descriptions-item label="资源">{{ detail.resource }}</el-descriptions-item>
        <el-descriptions-item label="动作">
          <el-tag :type="actionTagType(detail.action)">{{ detail.action }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="目标 ID" :span="2">
          <span v-if="detail.resourceId">#{{ detail.resourceId }}</span>
          <span v-else>-</span>
        </el-descriptions-item>
        <el-descriptions-item label="User-Agent" :span="2">
          <span class="mono">{{ detail.userAgent ?? '-' }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="Payload" :span="2">
          <pre class="json">{{ fmtJson(detail.payload) }}</pre>
        </el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 12px; }
.filter { margin-bottom: 12px; flex-wrap: wrap; }
.muted { color: #909399; font-size: 12px; }
.mono { font-family: monospace; font-size: 12px; word-break: break-all; }
.json {
  font-family: monospace;
  font-size: 12px;
  background: var(--app-bg-soft);
  padding: 8px;
  border-radius: 4px;
  max-height: 280px;
  overflow: auto;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>

