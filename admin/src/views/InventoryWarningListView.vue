<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  listAdminInventoryWarnings,
  setAdminProductThreshold,
  type AdminInventoryWarning
} from '../api/admin-inventory'

const loading = ref(false)
const list = ref<AdminInventoryWarning[]>([])

const editable = ref<Record<number, number>>({})
const saving = ref<Record<number, boolean>>({})

async function load() {
  loading.value = true
  try {
    const r = await listAdminInventoryWarnings()
    list.value = r
    const init: Record<number, number> = {}
    r.forEach((w) => { init[w.id] = w.threshold })
    editable.value = init
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '加载失败'
    ElMessage.error(msg)
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function saveThreshold(row: AdminInventoryWarning) {
  const value = editable.value[row.id]
  if (value === undefined || value < 0) {
    ElMessage.warning('阈值必须 ≥ 0')
    return
  }
  saving.value[row.id] = true
  try {
    await setAdminProductThreshold(row.id, value)
    ElMessage.success('已保存')
    await load()
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '保存失败'
    ElMessage.error(msg)
  } finally {
    saving.value[row.id] = false
  }
}

function asWarn(row: unknown): AdminInventoryWarning {
  return row as AdminInventoryWarning
}
</script>

<template>
  <div class="page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>库存预警商品</span>
          <span class="muted">当前 {{ list.length }} 个商品 stock ≤ threshold</span>
        </div>
      </template>

      <el-table v-loading="loading" :data="list" stripe>
        <el-table-column label="商品" min-width="240" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="product-cell">
              <el-image
                :src="asWarn(row).cover"
                style="width: 40px; height: 40px; border-radius: 4px; flex: 0 0 40px"
                fit="cover"
              />
              <span class="product-title">{{ asWarn(row).title }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="当前库存" width="120">
          <template #default="{ row }">
            <span class="stock-low">{{ asWarn(row).stock }}</span>
          </template>
        </el-table-column>
        <el-table-column label="阈值" width="120">
          <template #default="{ row }">
            <el-input-number
              v-model="editable[asWarn(row).id]"
              :min="0"
              :max="99999"
              :controls="false"
              size="small"
              style="width: 100px"
            />
          </template>
        </el-table-column>
        <el-table-column label="缺口" width="100">
          <template #default="{ row }">
            <span class="gap">-{{ asWarn(row).gap }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button
              v-permission="'inventory:warning'"
              type="primary"
              size="small"
              :loading="saving[asWarn(row).id]"
              @click="saveThreshold(asWarn(row))"
            >
              保存阈值
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && list.length === 0" description="暂无预警商品" :image-size="80" />
    </el-card>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 12px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.muted { color: #909399; font-size: 12px; }
.stock-low { color: #f56c6c; font-weight: 600; }
.gap { color: #e6a23c; font-weight: 600; }
.product-cell { display: flex; align-items: center; gap: 8px; }
.product-title { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>
