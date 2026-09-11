<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { listAdminUsers, getAdminUser, updateAdminUser, type AdminUser, type AdminUserQuery } from '../api/admin-users'

const loading = ref(false)
const list = ref<AdminUser[]>([])
const total = ref(0)
const query = reactive<AdminUserQuery>({ page: 1, pageSize: 10, keyword: '', status: undefined })

const editVisible = ref(false)
const editing = ref<AdminUser | null>(null)
const editForm = reactive({ nickname: '', phone: '', status: 1 as 0 | 1 })

async function load() {
  loading.value = true
  try {
    const res = await listAdminUsers({ ...query })
    list.value = res.list
    total.value = res.total
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
  query.keyword = ''
  query.status = undefined
  query.page = 1
  load()
}

function openEdit(row: AdminUser) {
  editing.value = row
  editForm.nickname = row.nickname ?? ''
  editForm.phone = row.phone ?? ''
  editForm.status = row.status as 0 | 1
  editVisible.value = true
}

async function submitEdit() {
  if (!editing.value) return
  await updateAdminUser(editing.value.id, { ...editForm })
  ElMessage.success('已保存')
  editVisible.value = false
  load()
}

async function toggleStatus(row: AdminUser) {
  const next = row.status === 1 ? 0 : 1
  try {
    await ElMessageBox.confirm(
      `确认要${next === 1 ? '启用' : '禁用'}账号「${row.username}」？`,
      '提示',
      { type: 'warning' }
    )
  } catch { return }
  await updateAdminUser(row.id, { status: next })
  ElMessage.success('已更新')
  load()
}

// 用户详情
const detailVisible = ref(false)
const detailLoading = ref(false)
const detail = ref<AdminUser | null>(null)

async function openDetail(row: AdminUser) {
  detailVisible.value = true
  detail.value = null
  detailLoading.value = true
  try {
    detail.value = await getAdminUser(row.id)
  } finally {
    detailLoading.value = false
  }
}
</script>

<template>
  <div class="page">
    <el-card>
      <el-form :inline="true" :model="query" class="filter">
        <el-form-item label="搜索">
          <el-input
            v-model="query.keyword"
            placeholder="用户名 / 昵称 / 手机号"
            clearable
            style="width: 220px"
            @keyup.enter="onSearch"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" clearable style="width: 120px">
            <el-option label="启用" :value="1" />
            <el-option label="禁用" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onSearch">查询</el-button>
          <el-button @click="onReset">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="loading" :data="list" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" label="账号" />
        <el-table-column prop="nickname" label="昵称" />
        <el-table-column prop="phone" label="手机号" width="140" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">
              {{ row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="注册时间" width="200">
          <template #default="{ row }">
            {{ new Date(row.createdAt).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button
              v-permission="'user:detail'"
              link
              type="primary"
              @click="openDetail(row as AdminUser)"
            >
              详情
            </el-button>
            <el-button
              v-permission="'user:edit'"
              link
              type="primary"
              @click="openEdit(row as AdminUser)"
            >
              编辑
            </el-button>
            <el-button
              v-permission="'user:edit'"
              link
              :type="row.status === 1 ? 'danger' : 'success'"
              @click="toggleStatus(row as AdminUser)"
            >
              {{ row.status === 1 ? '禁用' : '启用' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="query.page"
        v-model:page-size="query.pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        class="pager"
        @current-change="load"
        @size-change="load"
      />
    </el-card>

    <!-- 编辑用户 -->
    <el-dialog v-model="editVisible" title="编辑用户" width="500px">
      <el-form label-width="80px">
        <el-form-item label="账号">
          <el-input :model-value="editing?.username" disabled />
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="editForm.nickname" maxlength="32" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="editForm.phone" maxlength="20" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="editForm.status">
            <el-radio :value="1">启用</el-radio>
            <el-radio :value="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" @click="submitEdit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 详情抽屉 -->
    <el-drawer
      v-model="detailVisible"
      :title="detail ? `用户 ${detail.username}` : '用户详情'"
      size="420px"
      direction="rtl"
    >
      <div v-loading="detailLoading" class="detail">
        <template v-if="detail">
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="账号">{{ detail.username }}</el-descriptions-item>
            <el-descriptions-item label="昵称">{{ detail.nickname ?? '-' }}</el-descriptions-item>
            <el-descriptions-item label="手机号">{{ detail.phone ?? '-' }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="detail.status === 1 ? 'success' : 'info'">
                {{ detail.status === 1 ? '启用' : '禁用' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="历史订单数">
              <el-tag type="primary">{{ detail._count?.orders ?? 0 }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="注册时间">
              {{ new Date(detail.createdAt).toLocaleString() }}
            </el-descriptions-item>
            <el-descriptions-item label="更新时间">
              {{ new Date(detail.updatedAt).toLocaleString() }}
            </el-descriptions-item>
          </el-descriptions>
        </template>
      </div>
    </el-drawer>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 12px; }
.filter { margin-bottom: 12px; }
.pager { margin-top: 16px; justify-content: flex-end; }
.detail { padding: 0 4px; }
</style>
