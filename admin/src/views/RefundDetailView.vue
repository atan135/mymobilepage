<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getAdminRefund,
  approveAdminRefund,
  rejectAdminRefund,
  markAdminRefunded,
  REFUND_STATUS_LABELS,
  REFUND_STATUS_TAG_TYPE,
  type AdminRefundDetail
} from '../api/admin-refunds'

// 退款关联订单里的商品行类型；模板里 `(row as OrderItem)` 用于在 IDE 里拿到字段提示，
// 比在模板里塞 `extends infer` 条件类型更稳（Vue 模板只解析 JS 表达式，不识别 TS 条件类型）。
type OrderItem = NonNullable<AdminRefundDetail['order']>['items'][number]

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const detail = ref<AdminRefundDetail | null>(null)

async function load() {
  loading.value = true
  try {
    detail.value = await getAdminRefund(Number(route.params.id))
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '加载失败'
    ElMessage.error(msg)
  } finally {
    loading.value = false
  }
}

onMounted(load)

function back() {
  router.push({ name: 'admin-refunds' })
}

async function onApprove() {
  if (!detail.value) return
  try {
    await ElMessageBox.confirm(
      `确认批准退款申请 #${detail.value.id}？批准后需再点「标记已退款」完成。`,
      '提示',
      { type: 'warning' }
    )
  } catch {
    return
  }
  await approveAdminRefund(detail.value.id)
  ElMessage.success('已批准')
  await load()
}

async function onMarkRefunded() {
  if (!detail.value) return
  try {
    await ElMessageBox.confirm(
      `确认标记 #${detail.value.id} 为已退款？该操作会：\n1) 退还商品库存\n2) 退回关联优惠券\n3) 不可撤销`,
      '提示',
      { type: 'warning' }
    )
  } catch {
    return
  }
  await markAdminRefunded(detail.value.id)
  ElMessage.success('已退款')
  await load()
}

// 拒绝 Dialog
const rejectVisible = ref(false)
const rejectRemark = ref('')

function openReject() {
  rejectRemark.value = ''
  rejectVisible.value = true
}

async function submitReject() {
  if (!detail.value) return
  if (!rejectRemark.value.trim()) {
    ElMessage.warning('请输入拒绝原因')
    return
  }
  await rejectAdminRefund(detail.value.id, rejectRemark.value.trim())
  ElMessage.success('已拒绝')
  rejectVisible.value = false
  await load()
}
</script>

<template>
  <div class="page">
    <el-card v-loading="loading">
      <div class="header">
        <el-button link @click="back">← 返回列表</el-button>
        <h2 class="title">退款详情 #{{ detail?.id ?? '-' }}</h2>
        <el-tag v-if="detail" :type="REFUND_STATUS_TAG_TYPE[detail.status]" size="large">
          {{ REFUND_STATUS_LABELS[detail.status] }}
        </el-tag>
      </div>

      <template v-if="detail">
        <el-descriptions :column="2" border class="block">
          <el-descriptions-item label="退款 ID">{{ detail.id }}</el-descriptions-item>
          <el-descriptions-item label="订单号">
            {{ detail.order?.orderNo ?? '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="退款金额">
            <span class="amount">¥{{ detail.amount.toFixed(2) }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="申请时间">
            {{ new Date(detail.createdAt).toLocaleString() }}
          </el-descriptions-item>
          <el-descriptions-item label="退款原因" :span="2">
            {{ detail.reason }}
          </el-descriptions-item>
          <el-descriptions-item v-if="detail.remark" label="备注 / 拒绝原因" :span="2">
            {{ detail.remark }}
          </el-descriptions-item>
        </el-descriptions>

        <template v-if="detail.order">
          <h4 class="block-title">订单信息</h4>
          <el-descriptions :column="2" border class="block">
            <el-descriptions-item label="订单号">{{ detail.order.orderNo }}</el-descriptions-item>
            <el-descriptions-item label="订单状态">
              <el-tag>{{ (['待付款', '待发货', '已发货', '已完成', '已取消'] as const)[detail.order.status] }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="订单总额">¥{{ detail.order.totalAmount.toFixed(2) }}</el-descriptions-item>
            <el-descriptions-item label="用户名">
              {{ detail.order.user?.username ?? '-' }}
            </el-descriptions-item>
            <el-descriptions-item v-if="detail.order.coupon" label="使用优惠券" :span="2">
              {{ detail.order.coupon.name }}（优惠 ¥{{ detail.order.coupon.amount.toFixed(2) }}）
            </el-descriptions-item>
          </el-descriptions>

          <h4 class="block-title">商品列表</h4>
          <el-table :data="detail.order.items" border size="small">
            <el-table-column label="封面" width="72">
              <template #default="{ row }">
                <el-image
                  :src="(row as OrderItem).productCover"
                  style="width: 56px; height: 56px; border-radius: 4px"
                  fit="cover"
                />
              </template>
            </el-table-column>
            <el-table-column label="商品" min-width="160" show-overflow-tooltip>
              <template #default="{ row }">
                {{ (row as OrderItem).productTitle }}
              </template>
            </el-table-column>
            <el-table-column label="单价" width="100">
              <template #default="{ row }">
                ¥{{ Number((row as OrderItem).price).toFixed(2) }}
              </template>
            </el-table-column>
            <el-table-column label="数量" width="70">
              <template #default="{ row }">
                {{ (row as OrderItem).quantity }}
              </template>
            </el-table-column>
            <el-table-column label="小计" width="100">
              <template #default="{ row }">
                ¥{{ (Number((row as OrderItem).price) * (row as OrderItem).quantity).toFixed(2) }}
              </template>
            </el-table-column>
          </el-table>
        </template>

        <div class="actions">
          <el-button v-if="detail.status === 0" v-permission="'refund:approve'" type="success" @click="onApprove">
            批准
          </el-button>
          <el-button v-if="detail.status === 0" v-permission="'refund:reject'" type="danger" plain @click="openReject">
            拒绝
          </el-button>
          <el-button v-if="detail.status === 1" v-permission="'refund:refund'" type="warning" @click="onMarkRefunded">
            标记已退款
          </el-button>
          <el-tag v-if="detail.status === 2" type="info">已拒绝</el-tag>
          <el-tag v-if="detail.status === 3" type="danger">已退款（库存已恢复，优惠券已退回）</el-tag>
        </div>
      </template>
    </el-card>

    <el-dialog v-model="rejectVisible" title="拒绝退款" width="420px">
      <el-form label-width="80px">
        <el-form-item label="拒绝原因" required>
          <el-input v-model="rejectRemark" type="textarea" :rows="3" maxlength="500" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectVisible = false">取消</el-button>
        <el-button type="danger" @click="submitReject">确认拒绝</el-button>
      </template>
    </el-dialog>
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
.title {
  font-size: 18px;
  margin: 0;
  flex: 1;
}
.block { margin-bottom: 8px; }
.block-title {
  margin: 16px 0 8px;
  font-size: 14px;
}
.amount {
  color: #f56c6c;
  font-weight: 600;
}
.actions {
  display: flex;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid var(--app-border-color);
  margin-top: 16px;
}
</style>
