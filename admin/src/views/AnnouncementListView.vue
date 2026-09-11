<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  listAdminAnnouncements,
  createAdminAnnouncement,
  updateAdminAnnouncement,
  publishAdminAnnouncement,
  unpublishAdminAnnouncement,
  deleteAdminAnnouncement,
  type AdminAnnouncement
} from '../api/admin-announcements'

const loading = ref(false)
const list = ref<AdminAnnouncement[]>([])

interface FormState {
  id: number | null
  title: string
  content: string
  link: string
  sort: number
  status: 0 | 1
}
const form = reactive<FormState>({
  id: null,
  title: '',
  content: '',
  link: '',
  sort: 0,
  status: 0
})
const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')

async function load() {
  loading.value = true
  try {
    list.value = await listAdminAnnouncements()
  } finally {
    loading.value = false
  }
}

onMounted(load)

function openCreate() {
  form.id = null
  form.title = ''
  form.content = ''
  form.link = ''
  form.sort = list.value.length ? Math.max(...list.value.map((a) => a.sort)) + 1 : 1
  form.status = 0
  dialogMode.value = 'create'
  dialogVisible.value = true
}

function openEdit(row: AdminAnnouncement) {
  form.id = row.id
  form.title = row.title
  form.content = row.content
  form.link = row.link ?? ''
  form.sort = row.sort
  form.status = row.status as 0 | 1
  dialogMode.value = 'edit'
  dialogVisible.value = true
}

async function submit() {
  if (!form.title.trim()) {
    ElMessage.warning('请输入公告标题')
    return
  }
  if (!form.content.trim()) {
    ElMessage.warning('请输入公告内容')
    return
  }
  const payload = {
    title: form.title.trim(),
    content: form.content.trim(),
    link: form.link.trim() || undefined,
    sort: form.sort,
    status: form.status
  }
  if (dialogMode.value === 'create') {
    await createAdminAnnouncement(payload)
    ElMessage.success('已创建')
  } else {
    await updateAdminAnnouncement(form.id!, payload)
    ElMessage.success('已更新')
  }
  dialogVisible.value = false
  load()
}

async function publish(row: AdminAnnouncement) {
  await publishAdminAnnouncement(row.id)
  ElMessage.success('已发布')
  load()
}

async function unpublish(row: AdminAnnouncement) {
  await unpublishAdminAnnouncement(row.id)
  ElMessage.success('已取消发布')
  load()
}

async function remove(row: AdminAnnouncement) {
  try {
    await ElMessageBox.confirm(`确认删除公告「${row.title}」？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  await deleteAdminAnnouncement(row.id)
  ElMessage.success('已删除')
  load()
}
</script>

<template>
  <div class="page">
    <el-card>
      <div class="toolbar">
        <el-button v-permission="'announcement:create'" type="primary" @click="openCreate">
          新建公告
        </el-button>
      </div>

      <el-table v-loading="loading" :data="list" stripe row-key="id">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
        <el-table-column label="内容" min-width="240">
          <template #default="{ row }">
            <span class="content-cell">{{ row.content }}</span>
          </template>
        </el-table-column>
        <el-table-column label="链接" width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.link">{{ row.link }}</span>
            <span v-else class="muted">无</span>
          </template>
        </el-table-column>
        <el-table-column prop="sort" label="排序" width="80" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">
              {{ row.status === 1 ? '已发布' : '草稿' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="发布时间" width="200">
          <template #default="{ row }">
            <span v-if="row.publishedAt">{{ new Date(row.publishedAt).toLocaleString() }}</span>
            <span v-else class="muted">未发布</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <el-button v-permission="'announcement:edit'" link type="primary" @click="openEdit(row)">
              编辑
            </el-button>
            <template v-if="row.status === 1">
              <el-button v-permission="'announcement:publish'" link type="warning" @click="unpublish(row)">
                下架
              </el-button>
            </template>
            <template v-else>
              <el-button v-permission="'announcement:publish'" link type="success" @click="publish(row)">
                发布
              </el-button>
            </template>
            <el-button v-permission="'announcement:delete'" link type="danger" @click="remove(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新建公告' : '编辑公告'"
      width="640px"
      top="5vh"
    >
      <el-form label-width="100px">
        <el-form-item label="标题" required>
          <el-input v-model="form.title" maxlength="128" />
        </el-form-item>
        <el-form-item label="内容" required>
          <el-input v-model="form.content" type="textarea" :rows="6" maxlength="5000" show-word-limit />
        </el-form-item>
        <el-form-item label="跳转链接">
          <el-input v-model="form.link" maxlength="500" placeholder="选填，例如 /pages/notice/123" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio :value="0">草稿</el-radio>
            <el-radio :value="1">立即发布</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 12px; }
.toolbar { margin-bottom: 12px; }
.muted { color: #909399; font-size: 12px; }
.content-cell {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: normal;
  color: #606266;
  font-size: 13px;
}
</style>
