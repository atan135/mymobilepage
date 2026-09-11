<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  listAdminBanners,
  createAdminBanner,
  updateAdminBanner,
  deleteAdminBanner,
  type AdminBanner
} from '../api/admin-banners'

const loading = ref(false)
const list = ref<AdminBanner[]>([])

interface FormState {
  id: number | null
  image: string
  link: string
  sort: number
  enabled: boolean
}
const form = reactive<FormState>({
  id: null,
  image: '',
  link: '',
  sort: 0,
  enabled: true
})
const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')

async function load() {
  loading.value = true
  try {
    list.value = await listAdminBanners()
  } finally {
    loading.value = false
  }
}

onMounted(load)

function openCreate() {
  form.id = null
  form.image = ''
  form.link = ''
  form.sort = list.value.length ? Math.max(...list.value.map((b) => b.sort)) + 1 : 1
  form.enabled = true
  dialogMode.value = 'create'
  dialogVisible.value = true
}

function openEdit(row: AdminBanner) {
  form.id = row.id
  form.image = row.image
  form.link = row.link ?? ''
  form.sort = row.sort
  form.enabled = row.enabled
  dialogMode.value = 'edit'
  dialogVisible.value = true
}

async function submit() {
  if (!form.image.trim()) {
    ElMessage.warning('请输入图片 URL')
    return
  }
  const payload = {
    image: form.image.trim(),
    link: form.link.trim() || undefined,
    sort: form.sort,
    enabled: form.enabled
  }
  if (dialogMode.value === 'create') {
    await createAdminBanner(payload)
    ElMessage.success('已创建')
  } else {
    await updateAdminBanner(form.id!, payload)
    ElMessage.success('已更新')
  }
  dialogVisible.value = false
  load()
}

async function remove(row: AdminBanner) {
  try {
    await ElMessageBox.confirm('确认删除该轮播图？', '提示', { type: 'warning' })
  } catch {
    return
  }
  await deleteAdminBanner(row.id)
  ElMessage.success('已删除')
  load()
}
</script>

<template>
  <div class="page">
    <el-card>
      <div class="toolbar">
        <el-button v-permission="'banner:create'" type="primary" @click="openCreate">
          新建轮播图
        </el-button>
      </div>

      <el-table v-loading="loading" :data="list" stripe row-key="id">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="预览图" width="160">
          <template #default="{ row }">
            <el-image
              v-if="row.image"
              :src="row.image"
              style="width: 120px; height: 48px; border-radius: 4px"
              fit="cover"
              :preview-src-list="[row.image]"
              hide-on-click-modal
            />
            <span v-else class="muted">无</span>
          </template>
        </el-table-column>
        <el-table-column label="跳转链接" min-width="200">
          <template #default="{ row }">
            <el-link v-if="row.link" :href="row.link" target="_blank" type="primary" :underline="false">
              {{ row.link }}
            </el-link>
            <span v-else class="muted">无</span>
          </template>
        </el-table-column>
        <el-table-column prop="sort" label="排序" width="80" />
        <el-table-column label="启用" width="100">
          <template #default="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'info'">
              {{ row.enabled ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="200">
          <template #default="{ row }">
            {{ new Date(row.createdAt).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button v-permission="'banner:edit'" link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button v-permission="'banner:delete'" link type="danger" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新建轮播图' : '编辑轮播图'"
      width="560px"
    >
      <el-form label-width="100px">
        <el-form-item label="图片 URL" required>
          <el-input v-model="form.image" maxlength="500" placeholder="https://..." />
        </el-form-item>
        <el-form-item label-width="100px">
          <el-image
            v-if="form.image"
            :src="form.image"
            style="width: 200px; height: 80px; border-radius: 4px"
            fit="cover"
          />
        </el-form-item>
        <el-form-item label="跳转链接">
          <el-input v-model="form.link" maxlength="500" placeholder="选填，例如 /pages/home" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="form.enabled" />
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
</style>
