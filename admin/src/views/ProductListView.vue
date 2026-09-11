<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  listAdminProducts,
  createAdminProduct,
  updateAdminProduct,
  setAdminProductStatus,
  adjustAdminProductStock,
  deleteAdminProduct,
  type AdminProduct,
  type AdminProductQuery
} from '../api/admin-products'
import { listAdminCategories } from '../api/admin-categories'

import type { AdminCategory } from '../api/types'

const loading = ref(false)
const list = ref<AdminProduct[]>([])
const total = ref(0)
const categories = ref<AdminCategory[]>([])

const query = reactive<AdminProductQuery>({
  page: 1,
  pageSize: 10,
  keyword: '',
  categoryId: undefined,
  status: undefined,
  minPrice: undefined,
  maxPrice: undefined
})

const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')

interface FormState {
  id: number | null
  title: string
  price: number
  originalPrice: number | null
  cover: string
  images: string[]
  description: string
  stock: number
  status: 0 | 1
  categoryId: number | null
}
const form = reactive<FormState>({
  id: null,
  title: '',
  price: 0,
  originalPrice: null,
  cover: '',
  images: [],
  description: '',
  stock: 0,
  status: 1,
  categoryId: null
})

const stockDialogVisible = ref(false)
const stockTarget = ref<AdminProduct | null>(null)
const stockValue = ref(0)

async function load() {
  loading.value = true
  try {
    const res = await listAdminProducts({
      ...query,
      minPrice: query.minPrice || undefined,
      maxPrice: query.maxPrice || undefined
    })
    list.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

async function loadCategories() {
  categories.value = await listAdminCategories()
}

onMounted(async () => {
  await loadCategories()
  await load()
})

function onSearch() {
  query.page = 1
  load()
}

function onReset() {
  query.keyword = ''
  query.categoryId = undefined
  query.status = undefined
  query.minPrice = undefined
  query.maxPrice = undefined
  query.page = 1
  load()
}

function openCreate() {
  form.id = null
  form.title = ''
  form.price = 0
  form.originalPrice = null
  form.cover = ''
  form.images = []
  form.description = ''
  form.stock = 0
  form.status = 1
  form.categoryId = categories.value[0]?.id ?? null
  dialogMode.value = 'create'
  dialogVisible.value = true
}

function openEdit(row: AdminProduct) {
  form.id = row.id
  form.title = row.title
  form.price = Number(row.price)
  form.originalPrice = row.originalPrice ? Number(row.originalPrice) : null
  form.cover = row.cover
  form.images = [...(row.images ?? [])]
  form.description = row.description ?? ''
  form.stock = row.stock
  form.status = row.status as 0 | 1
  form.categoryId = row.categoryId
  dialogMode.value = 'edit'
  dialogVisible.value = true
}

async function submit() {
  if (!form.title.trim()) { ElMessage.warning('请输入标题'); return }
  if (!form.cover.trim()) { ElMessage.warning('请输入封面图 URL'); return }
  if (!form.categoryId) { ElMessage.warning('请选择分类'); return }
  const payload = {
    title: form.title.trim(),
    price: form.price,
    originalPrice: form.originalPrice ?? undefined,
    cover: form.cover.trim(),
    images: form.images.filter((s) => s.trim()),
    description: form.description.trim() || undefined,
    stock: form.stock,
    status: form.status,
    categoryId: form.categoryId
  }
  if (dialogMode.value === 'create') {
    await createAdminProduct(payload)
    ElMessage.success('已创建')
  } else {
    await updateAdminProduct(form.id!, payload)
    ElMessage.success('已更新')
  }
  dialogVisible.value = false
  load()
}

async function toggleStatus(row: AdminProduct) {
  const next = row.status === 1 ? 0 : 1
  await setAdminProductStatus(row.id, next)
  ElMessage.success(next === 1 ? '已上架' : '已下架')
  load()
}

function openStock(row: AdminProduct) {
  stockTarget.value = row
  stockValue.value = row.stock
  stockDialogVisible.value = true
}

async function submitStock() {
  if (!stockTarget.value) return
  await adjustAdminProductStock(stockTarget.value.id, stockValue.value)
  ElMessage.success('已更新库存')
  stockDialogVisible.value = false
  load()
}

async function remove(row: AdminProduct) {
  try {
    await ElMessageBox.confirm(`确认删除商品「${row.title}」？`, '提示', { type: 'warning' })
  } catch { return }
  await deleteAdminProduct(row.id)
  ElMessage.success('已删除')
  load()
}

const coverImagesText = computed({
  get: () => form.images.join('\n'),
  set: (v: string) => { form.images = v.split('\n').map((s) => s.trim()).filter(Boolean) }
})
</script>

<template>
  <div class="page">
    <el-card>
      <el-form :inline="true" :model="query" class="filter">
        <el-form-item label="搜索">
          <el-input v-model="query.keyword" placeholder="商品标题" clearable style="width:200px" @keyup.enter="onSearch" />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="query.categoryId" placeholder="全部" clearable style="width:160px">
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" clearable style="width:120px">
            <el-option label="上架" :value="1" />
            <el-option label="下架" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item label="价格">
          <el-input v-model.number="query.minPrice" placeholder="最低" style="width:90px" />
          ~
          <el-input v-model.number="query.maxPrice" placeholder="最高" style="width:90px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onSearch">查询</el-button>
          <el-button @click="onReset">重置</el-button>
          <el-button v-permission="'product:create'" type="success" @click="openCreate">新建商品</el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="loading" :data="list" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="封面" width="80">
          <template #default="{ row }">
            <el-image :src="row.cover" style="width:40px;height:40px;border-radius:4px" fit="cover" />
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
        <el-table-column label="分类" width="120">
          <template #default="{ row }">{{ row.category?.name ?? row.categoryId }}</template>
        </el-table-column>
        <el-table-column label="价格" width="120">
          <template #default="{ row }">
            ¥{{ Number(row.price).toFixed(2) }}
            <s v-if="row.originalPrice" style="color:#999;font-size:12px;margin-left:4px">¥{{ Number(row.originalPrice).toFixed(2) }}</s>
          </template>
        </el-table-column>
        <el-table-column prop="stock" label="库存" width="80" />
        <el-table-column prop="sales" label="销量" width="80" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">
              {{ row.status === 1 ? '上架' : '下架' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button v-permission="'product:on_off'" link :type="row.status === 1 ? 'danger' : 'success'" @click="toggleStatus(row as AdminProduct)">
              {{ row.status === 1 ? '下架' : '上架' }}
            </el-button>
            <el-button v-permission="'product:adjust_stock'" link type="primary" @click="openStock(row as AdminProduct)">
              调库存
            </el-button>
            <el-button v-permission="'product:edit'" link type="primary" @click="openEdit(row as AdminProduct)">编辑</el-button>
            <el-button v-permission="'product:delete'" link type="danger" @click="remove(row as AdminProduct)">删除</el-button>
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

    <!-- 编辑/新建商品 -->
    <el-dialog v-model="dialogVisible" :title="dialogMode === 'create' ? '新建商品' : '编辑商品'" width="640px" top="5vh">
      <el-form label-width="100px">
        <el-form-item label="标题" required>
          <el-input v-model="form.title" maxlength="128" />
        </el-form-item>
        <el-form-item label="分类" required>
          <el-select v-model="form.categoryId" placeholder="选择分类" style="width:100%">
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="封面 URL" required>
          <el-input v-model="form.cover" placeholder="https://..." />
        </el-form-item>
        <el-form-item label="图片列表">
          <el-input v-model="coverImagesText" type="textarea" :rows="4" placeholder="每行一个 URL" />
        </el-form-item>
        <el-form-item label="售价" required>
          <el-input-number v-model="form.price" :min="0" :precision="2" :step="0.01" />
        </el-form-item>
        <el-form-item label="原价">
          <el-input-number v-model="form.originalPrice" :min="0" :precision="2" :step="0.01" />
        </el-form-item>
        <el-form-item label="库存">
          <el-input-number v-model="form.stock" :min="0" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio :value="1">上架</el-radio>
            <el-radio :value="0">下架</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 调库存 -->
    <el-dialog v-model="stockDialogVisible" title="调整库存" width="400px">
      <el-form label-width="80px">
        <el-form-item label="商品">
          <el-input :model-value="stockTarget?.title" disabled />
        </el-form-item>
        <el-form-item label="当前库存">
          <el-input-number :model-value="stockTarget?.stock ?? 0" disabled />
        </el-form-item>
        <el-form-item label="调整为">
          <el-input-number v-model="stockValue" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="stockDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitStock">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 12px; }
.filter { margin-bottom: 12px; }
.pager { margin-top: 16px; justify-content: flex-end; }
</style>
