<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getAdminCoupon, listAdminCouponClaims, type AdminCoupon, type AdminCouponClaim } from '../api/admin-coupons'

const route = useRoute()
const router = useRouter()

const couponId = computed(() => Number(route.params.id))
const loading = ref(false)
const coupon = ref<AdminCoupon | null>(null)
const list = ref<AdminCouponClaim[]>([])
const total = ref(0)

const filter = reactive({
  status: undefined as number | undefined,
  source: undefined as number | undefined,
  page: 1,
  pageSize: 20
})

const COUPON_STATUS: Record<number, string> = { 0: '未使用', 1: '已使用', 2: '已过期' }
const SOURCE_LABEL: Record<number, string> = { 0: '主动领取', 1: '后台发放' }

async function load() {
  loading.value = true
  try {
    const [c, r] = await Promise.all([
      getAdminCoupon(couponId.value),
      listAdminCouponClaims(couponId.value, {
        status: filter.status,
        source: filter.source,
        page: filter.page,
        pageSize: filter.pageSize
      })
    ])
    coupon.value = c
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

function back() {
  router.push({ name: 'admin-coupons' })
}

function fmtAmount(): string {
  if (!coupon.value) return ''
  if (coupon.value.type === 2) return `${coupon.value.amount}%`
  return `¥${coupon.value.amount.toFixed(2)}`
}
</script>

<template>
  <div class="page">
    <el-card>
      <div class="header">
        <el-button link @click="back">← 返回列表</el-button>
        <h2 class="title">领取明细</h2>
      </div>
      <div v-if="coupon" class="info">
        <el-descriptions :column="3" border>
          <el-descriptions-item label="名称">{{ coupon.name }}</el-descriptions-item>
          <el-descriptions-item label="类型">
            {{ ({ 1: '满减', 2: '折扣', 3: '无门槛' } as Record<number, string>)[coupon.type] }}
          </el-descriptions-item>
          <el-descriptions-item label="面值">{{ fmtAmount() }}</el-descriptions-item>
          <el-descriptions-item label="门槛">
            <span v-if="coupon.type === 3">无</span>
            <span v-else>¥{{ coupon.threshold?.toFixed(2) }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="总量">{{ coupon.total }}</el-descriptions-item>
          <el-descriptions-item label="已领取">{{ coupon.claimed }}</el-descriptions-item>
          <el-descriptions-item label="有效期">
            {{ new Date(coupon.validFrom).toLocaleString() }}
            <br />
            至 {{ new Date(coupon.validTo).toLocaleString() }}
          </el-descriptions-item>
          <el-descriptions-item label="每人限领">{{ coupon.perUserLimit }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="coupon.status === 1 ? 'success' : 'info'">
              {{ coupon.status === 1 ? '启用' : '停用' }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-card>

    <el-card>
      <div class="toolbar">
        <el-select v-model="filter.status" placeholder="状态" clearable style="width: 130px" @change="load">
          <el-option label="未使用" :value="0" />
          <el-option label="已使用" :value="1" />
        </el-select>
        <el-select v-model="filter.source" placeholder="来源" clearable style="width: 130px" @change="load">
          <el-option label="主动领取" :value="0" />
          <el-option label="后台发放" :value="1" />
        </el-select>
        <el-button @click="load">刷新</el-button>
      </div>

      <el-table v-loading="loading" :data="list" stripe row-key="id">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="用户" min-width="180">
          <template #default="{ row }">
            <div>{{ row.user.username }}</div>
            <div class="muted">
              {{ row.user.nickname ?? '-' }} · {{ row.user.phone ?? '-' }}
            </div>
          </template>
        </el-table-column>
        <el-table-column label="来源" width="100">
          <template #default="{ row }">
            <el-tag :type="row.source === 1 ? 'success' : 'primary'">
              {{ SOURCE_LABEL[row.source] ?? '-' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : row.status === 2 ? 'info' : 'primary'">
              {{ COUPON_STATUS[row.status] ?? '-' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="领取时间" width="200">
          <template #default="{ row }">
            {{ new Date(row.receivedAt).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column label="使用时间" width="200">
          <template #default="{ row }">
            <span v-if="row.usedAt">{{ new Date(row.usedAt).toLocaleString() }}</span>
            <span v-else class="muted">-</span>
          </template>
        </el-table-column>
        <el-table-column label="过期时间" width="200">
          <template #default="{ row }">
            <span v-if="row.expiresAt">{{ new Date(row.expiresAt).toLocaleString() }}</span>
            <span v-else class="muted">-</span>
          </template>
        </el-table-column>
        <el-table-column label="使用订单" width="100">
          <template #default="{ row }">
            <span v-if="row.orderId">#{{ row.orderId }}</span>
            <span v-else class="muted">-</span>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="filter.page"
        v-model:page-size="filter.pageSize"
        :page-sizes="[20, 50, 100]"
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
.header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.title { font-size: 18px; margin: 0; }
.info { padding-top: 8px; }
.toolbar { display: flex; gap: 8px; margin-bottom: 12px; }
.muted { color: #909399; font-size: 12px; }
</style>
