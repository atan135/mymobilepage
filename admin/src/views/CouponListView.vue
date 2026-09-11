<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  listAdminCoupons,
  createAdminCoupon,
  updateAdminCoupon,
  updateAdminCouponStatus,
  deleteAdminCoupon,
  grantAdminCoupon,
  type AdminCoupon
} from '../api/admin-coupons'
import { listAdminUsers, type AdminUser } from '../api/admin-users'

const router = useRouter()

const loading = ref(false)
const list = ref<AdminCoupon[]>([])
const total = ref(0)

const filter = reactive({
  keyword: '',
  status: undefined as number | undefined,
  type: undefined as number | undefined,
  page: 1,
  pageSize: 10
})

const TYPE_LABEL: Record<number, string> = { 1: '满减', 2: '折扣', 3: '无门槛' }
const TYPE_UNIT: Record<number, string> = { 1: '元', 2: '%（如 85.5 表示 8.55 折）', 3: '元' }

const STATUS_LABEL: Record<number, string> = { 1: '启用', 0: '停用' }

function formatAmount(c: AdminCoupon): string {
  if (c.type === 2) return `${c.amount}%`
  return `¥${c.amount.toFixed(2)}`
}

async function load() {
  loading.value = true
  try {
    const r = await listAdminCoupons({
      keyword: filter.keyword || undefined,
      status: filter.status,
      type: filter.type,
      page: filter.page,
      pageSize: filter.pageSize
    })
    list.value = r.list
    total.value = r.total
  } finally {
    loading.value = false
  }
}

onMounted(load)

function resetFilter() {
  filter.keyword = ''
  filter.status = undefined
  filter.type = undefined
  filter.page = 1
  load()
}

interface FormState {
  id: number | null
  name: string
  type: 1 | 2 | 3
  threshold: number | null
  amount: number
  description: string
  validRange: [string, string] | null
  total: number
  perUserLimit: number
  status: 0 | 1
}
const form = reactive<FormState>({
  id: null,
  name: '',
  type: 1,
  threshold: null,
  amount: 0,
  description: '',
  validRange: null,
  total: 100,
  perUserLimit: 1,
  status: 1
})
const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')

const needThreshold = computed(() => form.type === 1 || form.type === 2)

function openCreate() {
  form.id = null
  form.name = ''
  form.type = 1
  form.threshold = null
  form.amount = 0
  form.description = ''
  form.validRange = null
  form.total = 100
  form.perUserLimit = 1
  form.status = 1
  dialogMode.value = 'create'
  dialogVisible.value = true
}

function openEdit(row: AdminCoupon) {
  form.id = row.id
  form.name = row.name
  form.type = row.type as 1 | 2 | 3
  form.threshold = row.threshold
  form.amount = row.amount
  form.description = row.description ?? ''
  form.validRange = [row.validFrom, row.validTo]
  form.total = row.total
  form.perUserLimit = row.perUserLimit
  form.status = row.status as 0 | 1
  dialogMode.value = 'edit'
  dialogVisible.value = true
}

async function submit() {
  if (!form.name.trim()) return ElMessage.warning('请输入名称')
  if (!form.validRange || form.validRange.length !== 2) {
    return ElMessage.warning('请选择有效期')
  }
  const [validFrom, validTo] = form.validRange
  if (new Date(validFrom) >= new Date(validTo)) {
    return ElMessage.warning('有效期开始时间必须早于结束时间')
  }
  if (form.type !== 3 && (form.threshold === null || form.threshold < 0)) {
    return ElMessage.warning('请填写门槛金额')
  }
  if (form.amount <= 0) return ElMessage.warning('请填写面值')
  if (form.type === 2 && form.amount >= 100) {
    return ElMessage.warning('折扣率必须小于 100（即大于 0 折）')
  }
  if (form.total < 1) return ElMessage.warning('总量必须 ≥ 1')
  if (form.perUserLimit < 1) return ElMessage.warning('每人限领必须 ≥ 1')

  const payload = {
    name: form.name.trim(),
    type: form.type,
    threshold: form.type === 3 ? null : Number(form.threshold),
    amount: Number(form.amount),
    description: form.description.trim() || undefined,
    validFrom,
    validTo,
    total: Number(form.total),
    perUserLimit: Number(form.perUserLimit),
    status: form.status
  }
  if (dialogMode.value === 'create') {
    await createAdminCoupon(payload)
    ElMessage.success('已创建')
  } else {
    await updateAdminCoupon(form.id!, payload)
    ElMessage.success('已更新')
  }
  dialogVisible.value = false
  load()
}

async function toggleStatus(row: AdminCoupon) {
  const next = row.status === 1 ? 0 : 1
  await updateAdminCouponStatus(row.id, next)
  ElMessage.success(next === 1 ? '已启用' : '已停用')
  load()
}

async function remove(row: AdminCoupon) {
  try {
    await ElMessageBox.confirm(`确认删除优惠券「${row.name}」？`, '提示', { type: 'warning' })
  } catch {
    return
  }
  await deleteAdminCoupon(row.id)
  ElMessage.success('已删除')
  load()
}

function goClaims(row: AdminCoupon) {
  router.push({ name: 'admin-coupon-claims', params: { id: String(row.id) } })
}

// Grant dialog
const grantDialogVisible = ref(false)
const grantCouponId = ref<number | null>(null)
const grantCouponName = ref('')
const grantSelected = ref<number[]>([])
const userOptions = ref<AdminUser[]>([])
const userLoading = ref(false)

async function loadUsers() {
  userLoading.value = true
  try {
    const r = await listAdminUsers({ page: 1, pageSize: 100 })
    userOptions.value = r.list
  } finally {
    userLoading.value = false
  }
}

async function openGrant(row: AdminCoupon) {
  grantCouponId.value = row.id
  grantCouponName.value = row.name
  grantSelected.value = []
  if (userOptions.value.length === 0) await loadUsers()
  grantDialogVisible.value = true
}

async function submitGrant() {
  if (!grantCouponId.value || grantSelected.value.length === 0) {
    return ElMessage.warning('请选择至少一个用户')
  }
  const r = await grantAdminCoupon(grantCouponId.value, grantSelected.value)
  ElMessage.success(`已发放 ${r.granted} 张，跳过 ${r.skipped} 人（剩余 ${r.remaining}）`)
  grantDialogVisible.value = false
  load()
}
</script>

<template>
  <div class="page">
    <el-card>
      <div class="toolbar">
        <el-input
          v-model="filter.keyword"
          placeholder="搜索名称 / 描述"
          clearable
          style="width: 220px"
          @keyup.enter="load"
        />
        <el-select
          v-model="filter.status"
          placeholder="状态"
          clearable
          style="width: 130px"
          @change="load"
        >
          <el-option label="启用" :value="1" />
          <el-option label="停用" :value="0" />
        </el-select>
        <el-select
          v-model="filter.type"
          placeholder="类型"
          clearable
          style="width: 130px"
          @change="load"
        >
          <el-option label="满减" :value="1" />
          <el-option label="折扣" :value="2" />
          <el-option label="无门槛" :value="3" />
        </el-select>
        <el-button @click="resetFilter">重置</el-button>
        <el-button type="primary" @click="load">查询</el-button>
        <el-button v-permission="'coupon:create'" type="success" @click="openCreate">
          新建优惠券
        </el-button>
      </div>

      <el-table v-loading="loading" :data="list" stripe row-key="id">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="name" label="名称" min-width="180" show-overflow-tooltip />
        <el-table-column label="类型" width="80">
          <template #default="{ row }">
            <el-tag>{{ TYPE_LABEL[row.type] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="门槛" width="100">
          <template #default="{ row }">
            <span v-if="row.type === 3" class="muted">无</span>
            <span v-else>¥{{ row.threshold?.toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="面值" width="140">
          <template #default="{ row }">
            {{ formatAmount(row) }}
          </template>
        </el-table-column>
        <el-table-column label="有效期" width="200">
          <template #default="{ row }">
            <div class="time-cell">
              {{ new Date(row.validFrom).toLocaleString() }}
            </div>
            <div class="time-cell">
              至 {{ new Date(row.validTo).toLocaleString() }}
            </div>
          </template>
        </el-table-column>
        <el-table-column label="已领 / 总量" width="110">
          <template #default="{ row }">
            {{ row.claimed }} / {{ row.total }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">
              {{ STATUS_LABEL[row.status] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button v-permission="'coupon:edit'" link type="primary" @click="openEdit(row)">
              编辑
            </el-button>
            <el-button
              v-permission="'coupon:on_off'"
              link
              :type="row.status === 1 ? 'warning' : 'success'"
              @click="toggleStatus(row)"
            >
              {{ row.status === 1 ? '停用' : '启用' }}
            </el-button>
            <el-button v-permission="'coupon:list'" link type="info" @click="goClaims(row)">
              领取明细
            </el-button>
            <el-button v-permission="'coupon:grant'" link type="primary" @click="openGrant(row)">
              手动发放
            </el-button>
            <el-button v-permission="'coupon:delete'" link type="danger" @click="remove(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="filter.page"
        v-model:page-size="filter.pageSize"
        :page-sizes="[10, 20, 50]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        style="margin-top: 12px; justify-content: flex-end"
        @current-change="load"
        @size-change="load"
      />
    </el-card>

    <!-- 新建 / 编辑 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新建优惠券' : '编辑优惠券'"
      width="640px"
      top="5vh"
    >
      <el-form label-width="100px">
        <el-form-item label="名称" required>
          <el-input v-model="form.name" maxlength="128" show-word-limit />
        </el-form-item>
        <el-form-item label="类型" required>
          <el-radio-group v-model="form.type">
            <el-radio :value="1">满减</el-radio>
            <el-radio :value="2">折扣</el-radio>
            <el-radio :value="3">无门槛</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="needThreshold" label="门槛" required>
          <el-input-number v-model="form.threshold" :min="0" :precision="2" :step="10" />
          <span class="form-hint">订单金额满 ¥X 可用</span>
        </el-form-item>
        <el-form-item label="面值" required>
          <el-input-number v-model="form.amount" :min="0" :precision="2" :step="form.type === 2 ? 0.5 : 5" />
          <span class="form-hint">{{ TYPE_UNIT[form.type] }}</span>
        </el-form-item>
        <el-form-item label="总量" required>
          <el-input-number v-model="form.total" :min="1" :step="50" />
        </el-form-item>
        <el-form-item label="每人限领" required>
          <el-input-number v-model="form.perUserLimit" :min="1" :max="form.total" />
        </el-form-item>
        <el-form-item label="有效期" required>
          <el-date-picker
            v-model="form.validRange"
            type="datetimerange"
            value-format="YYYY-MM-DDTHH:mm:ss.SSS[Z]"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="3" maxlength="1000" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 手动发放 -->
    <el-dialog
      v-model="grantDialogVisible"
      :title="`手动发放 - ${grantCouponName}`"
      width="560px"
    >
      <el-form label-width="80px">
        <el-form-item label="选择用户">
          <el-select
            v-model="grantSelected"
            multiple
            filterable
            placeholder="搜索并选择用户"
            style="width: 100%"
            :loading="userLoading"
          >
            <el-option
              v-for="u in userOptions"
              :key="u.id"
              :label="`${u.username}${u.nickname ? `（${u.nickname}）` : ''}`"
              :value="u.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="grantDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitGrant">发放</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 12px; }
.toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  align-items: center;
  flex-wrap: wrap;
}
.muted { color: #909399; font-size: 12px; }
.time-cell { font-size: 12px; color: #606266; line-height: 1.4; }
.form-hint {
  margin-left: 8px;
  color: #909399;
  font-size: 12px;
}
</style>
