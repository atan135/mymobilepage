<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  listAdminCategories,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory
} from '../api/admin-categories'
import type { AdminCategory } from '../api/types'

const loading = ref(false)
const list = ref<AdminCategory[]>([])

interface FormState {
  id: number | null
  name: string
  icon: string
  sort: number
}
const form = reactive<FormState>({ id: null, name: '', icon: '', sort: 0 })
const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')

async function load() {
  loading.value = true
  try {
    list.value = await listAdminCategories()
  } finally {
    loading.value = false
  }
}

onMounted(load)

function openCreate() {
  form.id = null
  form.name = ''
  form.icon = ''
  form.sort = list.value.length ? (Math.max(...list.value.map((c) => c.sort)) + 1) : 1
  dialogMode.value = 'create'
  dialogVisible.value = true
}

function openEdit(row: AdminCategory) {
  form.id = row.id
  form.name = row.name
  form.icon = row.icon ?? ''
  form.sort = row.sort
  dialogMode.value = 'edit'
  dialogVisible.value = true
}

async function submit() {
  if (!form.name.trim()) {
    ElMessage.warning('请输入分类名称')
    return
  }
  const payload = {
    name: form.name.trim(),
    icon: form.icon.trim() || undefined,
    sort: form.sort
  }
  if (dialogMode.value === 'create') {
    await createAdminCategory(payload)
    ElMessage.success('已创建')
  } else {
    await updateAdminCategory(form.id!, payload)
    ElMessage.success('已更新')
  }
  dialogVisible.value = false
  load()
}

async function remove(row: AdminCategory) {
  try {
    await ElMessageBox.confirm(`确认删除分类「${row.name}」？分类下存在商品时无法删除。`, '提示', { type: 'warning' })
  } catch { return }
  await deleteAdminCategory(row.id)
  ElMessage.success('已删除')
  load()
}

/**
 * 排序：与相邻行交换 sort 值。
 * 先按 sort 升序、id 升序排好，再交换。
 */
async function move(row: AdminCategory, dir: 'up' | 'down') {
  const sorted = [...list.value].sort((a, b) => {
    if (a.sort !== b.sort) return a.sort - b.sort
    return a.id - b.id
  })
  const idx = sorted.findIndex((c) => c.id === row.id)
  const target = dir === 'up' ? sorted[idx - 1] : sorted[idx + 1]
  if (!target) return
  const a = sorted[idx]
  const b = target
  try {
    await Promise.all([
      updateAdminCategory(a.id, { sort: b.sort }),
      updateAdminCategory(b.id, { sort: a.sort })
    ])
    ElMessage.success(dir === 'up' ? '已上移' : '已下移')
  } catch {
    ElMessage.error('排序失败')
  }
  load()
}
</script>

<template>
  <div class="page">
    <el-card>
      <div class="toolbar">
        <el-button v-permission="'category:create'" type="primary" @click="openCreate">新建分类</el-button>
        <span class="muted">点击「上移 / 下移」调整展示顺序</span>
      </div>

      <el-table v-loading="loading" :data="list" stripe row-key="id">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="图标" width="80">
          <template #default="{ row }">
            <el-image v-if="(row as AdminCategory).icon" :src="(row as AdminCategory).icon ?? undefined" style="width:36px;height:36px;border-radius:4px" fit="cover" />
            <span v-else class="muted">无</span>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="分类名称" />
        <el-table-column prop="sort" label="排序" width="100" />
        <el-table-column label="商品数" width="100">
          <template #default="{ row }">
            {{ (row as AdminCategory)._count?.products ?? 0 }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row, $index }">
            <el-button
              v-permission="'category:edit'"
              link
              :disabled="$index === 0"
              @click="move(row as AdminCategory, 'up')"
            >
              上移
            </el-button>
            <el-button
              v-permission="'category:edit'"
              link
              :disabled="$index === list.length - 1"
              @click="move(row as AdminCategory, 'down')"
            >
              下移
            </el-button>
            <el-button v-permission="'category:edit'" link type="primary" @click="openEdit(row as AdminCategory)">编辑</el-button>
            <el-button v-permission="'category:delete'" link type="danger" @click="remove(row as AdminCategory)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新建分类' : '编辑分类'"
      width="480px"
    >
      <el-form label-width="80px">
        <el-form-item label="名称" required>
          <el-input v-model="form.name" maxlength="32" />
        </el-form-item>
        <el-form-item label="图标 URL">
          <el-input v-model="form.icon" maxlength="500" placeholder="https://..." />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" />
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
.toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.muted { color: #909399; font-size: 12px; }
</style>
