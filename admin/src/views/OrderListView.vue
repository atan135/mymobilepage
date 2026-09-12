<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  listAdminOrders,
  getAdminOrder,
  updateAdminOrderStatus,
  shipAdminOrder,
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TAG_TYPE,
  type OrderListItem,
  type OrderDetail,
  type OrderStatus
} from '../api/admin-orders'
import { exportOrders } from '../api/admin-exports'

const loading = ref(false)
const list = ref<OrderListItem[]>([])
const total = ref(0)

const query = reactive({
  status: undefined as OrderStatus | undefined,
  keyword: '',
  page: 1,
  pageSize: 10
})

const router = useRouter()

function goRefund(id: number) {
  router.push({ name: 'admin-refund-detail', params: { id: String(id) } })
}

const tabs = [
  { label: '全部', value: undefined as OrderStatus | undefined },
  ...ORDER_STATUSES.map((s) => ({ label: ORDER_STATUS_LABELS[s], value: s }))
]

async function load() {
  loading.value = true
  try {
    const res = await listAdminOrders({ ...query })
    list.value = res.list
    total.value = res.total
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
  query.status = undefined
  query.page = 1
  load()
}

// 导出
const exportVisible = ref(false)
const exportForm = reactive({
  status: undefined as OrderStatus | undefined,
  keyword: '',
  dateFrom: '',
  dateTo: ''
})
const exporting = ref(false)

function openExport() {
  // 默认带上当前列表的 status / keyword，方便复用
  exportForm.status = query.status
  exportForm.keyword = query.keyword
  exportForm.dateFrom = ''
  exportForm.dateTo = ''
  exportVisible.value = true
}

async function submitExport() {
  exporting.value = true
  try {
    await exportOrders({
      status: exportForm.status,
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

// 抽屉：详情
const detailVisible = ref(false)
const detailLoading = ref(false)
const detail = ref<OrderDetail | null>(null)

async function openDetail(row: OrderListItem) {
  detailVisible.value = true
  detail.value = null
  detailLoading.value = true
  try {
    detail.value = await getAdminOrder(row.id)
  } finally {
    detailLoading.value = false
  }
}

// 发货 Dialog
const shipVisible = ref(false)
const shipTarget = ref<{ id: number; orderNo: string } | null>(null)
const shipForm = reactive({ shipCompany: '', shipNo: '' })

function openShip(target: { id: number; orderNo: string; status?: OrderStatus }) {
  shipTarget.value = { id: target.id, orderNo: target.orderNo }
  shipForm.shipCompany = ''
  shipForm.shipNo = ''
  shipVisible.value = true
}

async function submitShip() {
  if (!shipTarget.value) return
  if (!shipForm.shipCompany.trim() || !shipForm.shipNo.trim()) {
    ElMessage.warning('请录入物流公司与单号')
    return
  }
  await shipAdminOrder(shipTarget.value.id, {
    shipCompany: shipForm.shipCompany.trim(),
    shipNo: shipForm.shipNo.trim()
  })
  ElMessage.success('已发货')
  shipVisible.value = false
  load()
  if (detail.value && detail.value.id === shipTarget.value.id) {
    detail.value = await getAdminOrder(shipTarget.value.id)
  }
}

// 取消订单
async function cancelOrder(target: { id: number; orderNo: string; status?: OrderStatus }) {
  try {
    await ElMessageBox.confirm(
      `确认取消订单「${target.orderNo}」？该操作不可恢复。`,
      '提示',
      { type: 'warning' }
    )
  } catch {
    return
  }
  await updateAdminOrderStatus(target.id, 4)
  ElMessage.success('已取消')
  load()
  if (detail.value && detail.value.id === target.id) {
    detail.value = await getAdminOrder(target.id)
  }
}

const detailItemsSubtotal = computed(() => {
  if (!detail.value) return 0
  return detail.value.items.reduce((s, it) => s + it.price * it.quantity, 0)
})

/**
 * 类型守卫：把 el-table 默认 untyped row 收窄成 OrderListItem。
 * el-table 没有给 column 的 slot 提供类型，所以这里手动断言。
 */
function asOrder(row: unknown): OrderListItem {
  return row as OrderListItem
}
</script>

<template>
  <div class="page">
    <el-card>
      <el-tabs
        v-model="query.status"
        @tab-change="onTabChange"
        class="tabs"
      >
        <el-tab-pane
          v-for="t in tabs"
          :key="String(t.value)"
          :label="t.label"
          :name="String(t.value)"
        />
      </el-tabs>

      <el-form :inline="true" :model="query" class="filter">
        <el-form-item label="搜索">
          <el-input
            v-model="query.keyword"
            placeholder="订单 ID（纯数字）/ 用户名"
            clearable
            style="width: 220px"
            @keyup.enter="onSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onSearch">查询</el-button>
          <el-button @click="onReset">重置</el-button>
        </el-form-item>
        <el-form-item>
          <el-button v-permission="'export:orders'" type="success" plain @click="openExport">
            导出 Excel
          </el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="loading" :data="list" stripe>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="orderNo" label="订单号" min-width="180" />
        <el-table-column label="用户" min-width="140">
          <template #default="{ row }">
            {{ asOrder(row).user.nickname ?? asOrder(row).user.username }}
            <span class="muted">@{{ asOrder(row).user.username }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="itemCount" label="件数" width="70" />
        <el-table-column label="金额" width="120">
          <template #default="{ row }">
            ¥{{ Number(asOrder(row).totalAmount).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="ORDER_STATUS_TAG_TYPE[asOrder(row).status]">
              {{ ORDER_STATUS_LABELS[asOrder(row).status] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="下单时间" width="170">
          <template #default="{ row }">
            {{ new Date(asOrder(row).createdAt).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button v-permission="'order:detail'" link type="primary" @click="openDetail(asOrder(row))">
              详情
            </el-button>
            <el-button
              v-if="asOrder(row).status === 1"
              v-permission="'order:ship'"
              link
              type="success"
              @click="openShip(asOrder(row))"
            >
              发货
            </el-button>
            <el-button
              v-if="asOrder(row).status === 0 || asOrder(row).status === 1"
              v-permission="'order:cancel'"
              link
              type="danger"
              @click="cancelOrder(asOrder(row))"
            >
              取消
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

    <!-- 详情抽屉 -->
    <el-drawer
      v-model="detailVisible"
      :title="detail ? `订单 ${detail.orderNo}` : '订单详情'"
      size="520px"
      direction="rtl"
    >
      <div v-loading="detailLoading" class="detail">
        <template v-if="detail">
          <el-descriptions :column="1" border size="small" class="block">
            <el-descriptions-item label="状态">
              <el-tag :type="ORDER_STATUS_TAG_TYPE[detail.status]">
                {{ ORDER_STATUS_LABELS[detail.status] }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="用户">
              {{ detail.user.nickname ?? detail.user.username }}
              <span class="muted">@{{ detail.user.username }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="收货人">
              {{ detail.receiver.name }} · {{ detail.receiver.phone }}
            </el-descriptions-item>
            <el-descriptions-item label="收货地址">
              {{ detail.receiver.address }}
            </el-descriptions-item>
            <el-descriptions-item v-if="detail.remark" label="买家留言">
              {{ detail.remark }}
            </el-descriptions-item>
            <el-descriptions-item label="下单时间">
              {{ new Date(detail.createdAt).toLocaleString() }}
            </el-descriptions-item>
            <el-descriptions-item v-if="detail.paidAt" label="付款时间">
              {{ new Date(detail.paidAt).toLocaleString() }}
            </el-descriptions-item>
            <el-descriptions-item v-if="detail.shippedAt" label="发货时间">
              {{ new Date(detail.shippedAt).toLocaleString() }}
            </el-descriptions-item>
            <el-descriptions-item v-if="detail.completedAt" label="完成时间">
              {{ new Date(detail.completedAt).toLocaleString() }}
            </el-descriptions-item>
            <el-descriptions-item v-if="detail.cancelledAt" label="取消时间">
              {{ new Date(detail.cancelledAt).toLocaleString() }}
            </el-descriptions-item>
            <el-descriptions-item v-if="detail.shipCompany" label="物流">
              {{ detail.shipCompany }} · {{ detail.shipNo }}
            </el-descriptions-item>
          </el-descriptions>

          <h4 class="block-title">商品列表</h4>
          <el-table :data="detail.items" border size="small">
            <el-table-column label="封面" width="72">
              <template #default="{ row }">
                <el-image
                  :src="(row as OrderDetail['items'][number]).productCover"
                  style="width: 56px; height: 56px; border-radius: 4px"
                  fit="cover"
                />
              </template>
            </el-table-column>
            <el-table-column label="商品" min-width="160" show-overflow-tooltip>
              <template #default="{ row }">
                {{ (row as OrderDetail['items'][number]).productTitle }}
              </template>
            </el-table-column>
            <el-table-column label="单价" width="100">
              <template #default="{ row }">
                ¥{{ Number((row as OrderDetail['items'][number]).price).toFixed(2) }}
              </template>
            </el-table-column>
            <el-table-column label="数量" width="70">
              <template #default="{ row }">
                {{ (row as OrderDetail['items'][number]).quantity }}
              </template>
            </el-table-column>
            <el-table-column label="小计" width="100">
              <template #default="{ row }">
                ¥{{ (Number((row as OrderDetail['items'][number]).price) * (row as OrderDetail['items'][number]).quantity).toFixed(2) }}
              </template>
            </el-table-column>
          </el-table>
          <div class="totals">
            <span>商品小计：¥{{ detailItemsSubtotal.toFixed(2) }}</span>
            <span class="grand">订单总额：¥{{ Number(detail.totalAmount).toFixed(2) }}</span>
          </div>


          <template v-if="detail.refund">
            <h4 class="block-title">退款申请</h4>
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item label="退款 ID">
                <el-link type="primary" :underline="false" @click="goRefund(detail.refund.id)">
                  #{{ detail.refund.id }}
                </el-link>
              </el-descriptions-item>
              <el-descriptions-item label="状态">
                <el-tag :type="REFUND_STATUS_TAG_TYPE[detail.refund.status as RefundStatus]">
                  {{ REFUND_STATUS_LABELS[detail.refund.status as RefundStatus] }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="退款金额">
                <span class="refund-amount">¥{{ detail.refund.amount.toFixed(2) }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="原因" :span="2">
                {{ detail.refund.reason }}
              </el-descriptions-item>
            </el-descriptions>
          </template>

          <div class="actions-row">
              <el-button
                v-if="detail.status === 1"
                v-permission="'order:ship'"
                type="success"
                @click="openShip(detail)"
              >
                发货
              </el-button>
              <el-button
                v-if="detail.status === 0 || detail.status === 1"
                v-permission="'order:cancel'"
                type="danger"
                plain
                @click="cancelOrder(detail)"
              >
                取消订单
              </el-button>
          </div>
        </template>
      </div>
    </el-drawer>

    <!-- 发货 Dialog -->
    <el-dialog v-model="shipVisible" title="录入发货信息" width="420px">
      <el-form label-width="90px">
        <el-form-item label="订单号">
          <el-input :model-value="shipTarget?.orderNo" disabled />
        </el-form-item>
        <el-form-item label="物流公司" required>
          <el-select v-model="shipForm.shipCompany" placeholder="选择物流公司" style="width:100%">
            <el-option label="顺丰速运" value="顺丰速运" />
            <el-option label="中通快递" value="中通快递" />
            <el-option label="圆通速递" value="圆通速递" />
            <el-option label="韵达速递" value="韵达速递" />
            <el-option label="京东物流" value="京东物流" />
            <el-option label="邮政EMS" value="邮政EMS" />
          </el-select>
        </el-form-item>
        <el-form-item label="运单号" required>
          <el-input v-model="shipForm.shipNo" maxlength="64" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="shipVisible = false">取消</el-button>
        <el-button type="primary" @click="submitShip">确认发货</el-button>
      </template>
    </el-dialog>

    <!-- 导出 Dialog -->
    <el-dialog v-model="exportVisible" title="导出订单" width="480px">
      <el-form label-width="80px">
        <el-form-item label="订单状态">
          <el-select v-model="exportForm.status" placeholder="全部" clearable style="width: 100%">
            <el-option v-for="s in ORDER_STATUSES" :key="s" :label="ORDER_STATUS_LABELS[s]" :value="s" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键字">
          <el-input v-model="exportForm.keyword" placeholder="订单 ID（纯数字）/ 用户名" clearable />
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
        <el-form-item>
          <span class="muted">不选日期则导出全部记录</span>
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
.tabs { margin-bottom: 8px; }
.tabs :deep(.el-tabs__nav-wrap::after) { background: transparent; }
.filter { margin-bottom: 12px; }
.pager { margin-top: 16px; justify-content: flex-end; }
.muted { color: #909399; font-size: 12px; margin-left: 4px; }
.detail { display: flex; flex-direction: column; gap: 12px; }
.block { margin-bottom: 8px; }
.block-title { margin: 12px 0 8px; font-size: 14px; }
.totals {
  display: flex;
  justify-content: space-between;
  padding: 12px 4px 0;
  font-size: 13px;
  color: #606266;
}
.totals .grand { color: #f56c6c; font-weight: 600; }
.actions-row { display: flex; gap: 8px; padding-top: 16px; }
.refund-amount { color: #f56c6c; font-weight: 600; }
</style>
