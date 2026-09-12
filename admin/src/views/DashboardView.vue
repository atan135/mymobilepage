<script setup lang="ts">
import { onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  TitleComponent,
  LegendComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { useAdminAuthStore } from '../stores/admin-auth'
import {
  getDashboardOverview,
  getSalesTrend,
  type DashboardOverview,
  type DashboardPendingItem,
  type DashboardPendingItemType,
  type SalesTrendPoint
} from '../api/admin-dashboard'

echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  TitleComponent,
  LegendComponent,
  CanvasRenderer
])

const auth = useAdminAuthStore()
const router = useRouter()

const loading = ref(false)
const data = ref<DashboardOverview | null>(null)
const trend = ref<SalesTrendPoint[]>([])

const chartEl = ref<HTMLDivElement | null>(null)
const chart = shallowRef<echarts.ECharts | null>(null)

async function loadAll() {
  loading.value = true
  try {
    const [overview, sales] = await Promise.all([
      getDashboardOverview(),
      getSalesTrend(7)
    ])
    data.value = overview
    trend.value = sales
    renderChart()
  } finally {
    loading.value = false
  }
}

function renderChart() {
  if (!chartEl.value) return
  if (!chart.value) {
    chart.value = echarts.init(chartEl.value)
  }
  chart.value.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 30, bottom: 30 },
    xAxis: {
      type: 'category',
      data: trend.value.map((p) => p.date.slice(5)),
      boundaryGap: false
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: '销售额',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        areaStyle: { opacity: 0.12 },
        data: trend.value.map((p) => p.amount)
      }
    ]
  })
}

function resizeChart() {
  chart.value?.resize()
}

onMounted(async () => {
  if (auth.isLoggedIn && !auth.user) {
    try {
      await auth.fetchProfile()
    } catch {
      /* token 失效就放着，后续拦截器会处理 */
    }
  }
  await loadAll()
  window.addEventListener('resize', resizeChart)
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeChart)
  chart.value?.dispose()
  chart.value = null
})

type PendingKey = 'ship' | 'review' | 'pay'

function goPending(key: PendingKey) {
  if (key === 'ship') {
    router.push({ name: 'admin-orders', query: { status: 1 } })
  } else if (key === 'review') {
    router.push({ name: 'admin-refunds', query: { status: 0 } })
  } else {
    router.push({ name: 'admin-refunds', query: { status: 1 } })
  }
}

function goInventory() {
  router.push('/inventory/warnings')
}

function goPendingItem(item: DashboardPendingItem) {
  if (item.type === 'order') {
    router.push({
      name: 'admin-orders',
      query: { focus: item.refId, status: 1 }
    })
  } else {
    router.push({
      name: 'admin-refund-detail',
      params: { id: String(item.refId) }
    })
  }
}

const PENDING_TYPE_LABEL: Record<DashboardPendingItemType, string> = {
  order: '待发货',
  refund: '退款'
}

const PENDING_TYPE_TAG: Record<
  DashboardPendingItemType,
  'success' | 'warning' | 'danger' | 'info'
> = {
  order: 'warning',
  refund: 'danger'
}

function asItem(row: unknown): DashboardPendingItem {
  return row as DashboardPendingItem
}
</script>

<template>
  <div v-loading="loading" class="dashboard">
    <el-card class="welcome">
      <h2>欢迎，{{ auth.user?.nickname ?? auth.user?.username ?? 'Admin' }}</h2>
      <p class="meta">
        角色：<el-tag>{{ auth.user?.role ?? '-' }}</el-tag>
        <span class="sep">·</span>
        账号：{{ auth.user?.username ?? '-' }}
      </p>
    </el-card>

    <el-row :gutter="16" class="kpis">
      <el-col :span="8">
        <el-card>
          <div class="kpi-label">今日订单</div>
          <div class="kpi-value">{{ data?.todayOrders ?? '--' }}</div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <div class="kpi-label">今日 GMV</div>
          <div class="kpi-value">¥{{ (data?.todayGmv ?? 0).toFixed(2) }}</div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <div class="kpi-label">注册用户</div>
          <div class="kpi-value">{{ data?.totalUsers ?? '--' }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="kpis">
      <el-col :span="8">
        <el-card class="kpi-clickable" @click="goPending('ship')">
          <div class="kpi-label">待发货订单</div>
          <div
            class="kpi-value"
            :class="{ danger: (data?.pendingShipOrders ?? 0) > 0 }"
          >
            {{ data?.pendingShipOrders ?? '--' }}
          </div>
          <div class="kpi-hint">点击进入待发货列表 →</div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card class="kpi-clickable" @click="goPending('review')">
          <div class="kpi-label">待审退款</div>
          <div
            class="kpi-value"
            :class="{ danger: (data?.pendingRefundReviews ?? 0) > 0 }"
          >
            {{ data?.pendingRefundReviews ?? '--' }}
          </div>
          <div class="kpi-hint">点击进入退款审批 →</div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card class="kpi-clickable" @click="goPending('pay')">
          <div class="kpi-label">待打款</div>
          <div
            class="kpi-value"
            :class="{ danger: (data?.pendingRefunds ?? 0) > 0 }"
          >
            {{ data?.pendingRefunds ?? '--' }}
          </div>
          <div class="kpi-hint">点击进入退款审批 →</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>库存预警</span>
              <el-link type="primary" :underline="false" @click="goInventory">查看全部 →</el-link>
            </div>
          </template>
          <el-table
            v-if="data?.lowStockProducts?.length"
            :data="data.lowStockProducts"
            size="small"
            stripe
          >
            <el-table-column label="封面" width="60">
              <template #default="{ row }">
                <el-image
                  :src="row.cover"
                  style="width: 36px; height: 36px; border-radius: 4px"
                  fit="cover"
                />
              </template>
            </el-table-column>
            <el-table-column label="商品" min-width="160" show-overflow-tooltip>
              <template #default="{ row }">{{ row.title }}</template>
            </el-table-column>
            <el-table-column label="库存 / 阈值" width="120">
              <template #default="{ row }">
                <span class="stock-low">{{ row.stock }}</span>
                <span class="muted"> / {{ row.threshold }}</span>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-else description="暂无库存预警" :image-size="60" />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <el-col :span="16">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>近 7 天销售趋势</span>
              <span class="muted">已付款 + 已发货 + 已完成</span>
            </div>
          </template>
          <div ref="chartEl" class="chart" />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>运营待办 Top5</span>
              <span class="muted">发货 / 退款审批 / 打款</span>
            </div>
          </template>
          <el-table
            v-if="data?.pendingItems?.length"
            :data="data.pendingItems"
            size="small"
            stripe
            @row-click="goPendingItem"
          >
            <el-table-column label="类型" width="70">
              <template #default="{ row }">
                <el-tag :type="PENDING_TYPE_TAG[asItem(row).type]" size="small">
                  {{ PENDING_TYPE_LABEL[asItem(row).type] }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="订单号 / 退款 ID" min-width="140" show-overflow-tooltip>
              <template #default="{ row }">{{ asItem(row).title }}</template>
            </el-table-column>
            <el-table-column label="金额" width="80">
              <template #default="{ row }">¥{{ Number(asItem(row).amount).toFixed(2) }}</template>
            </el-table-column>
          </el-table>
          <el-empty v-else description="暂无运营待办" :image-size="60" />
        </el-card>
      </el-col>
    </el-row>

    <el-card>
      <template #header>
        <span>热销商品 Top 10</span>
      </template>
      <el-table
        v-if="data?.topProducts?.length"
        :data="data.topProducts"
        stripe
        size="small"
      >
        <el-table-column label="排名" width="60" type="index" />
        <el-table-column label="封面" width="80">
          <template #default="{ row }">
            <el-image
              :src="row.cover"
              style="width: 56px; height: 56px; border-radius: 4px"
              fit="cover"
            />
          </template>
        </el-table-column>
        <el-table-column prop="title" label="商品名" min-width="240" show-overflow-tooltip />
        <el-table-column prop="sales" label="销量" width="80" />
        <el-table-column label="GMV" width="120">
          <template #default="{ row }">¥{{ Number(row.gmv).toFixed(2) }}</template>
        </el-table-column>
      </el-table>
      <el-empty v-else description="暂无销售数据" :image-size="60" />
    </el-card>
  </div>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.welcome h2 {
  margin: 0 0 8px;
  font-size: 22px;
}
.meta {
  color: #606266;
  font-size: 13px;
}
.meta .sep {
  margin: 0 8px;
  color: #c0c4cc;
}
.kpis .kpi-label {
  color: #909399;
  font-size: 13px;
}
.kpis .kpi-value {
  margin-top: 6px;
  font-size: 26px;
  font-weight: 600;
}
.kpis .kpi-value.danger {
  color: #f56c6c;
}
.kpis .kpi-clickable {
  cursor: pointer;
  transition: box-shadow 0.2s;
}
.kpis .kpi-clickable:hover {
  box-shadow: 0 2px 12px rgba(245, 108, 108, 0.15);
}
.kpis .kpi-hint {
  margin-top: 4px;
  font-size: 12px;
  color: #c0c4cc;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.muted {
  color: #909399;
  font-size: 12px;
  font-weight: normal;
}
.chart {
  width: 100%;
  height: 280px;
}
</style>