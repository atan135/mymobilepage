<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  bulkUpdateAdminSettings,
  listAdminSettings,
  SETTING_GROUPS,
  SETTING_GROUP_LABELS,
  type AdminSetting,
  type SettingGroup
} from '../api/admin-settings'

const loading = ref(false)
const savingGroup = ref<SettingGroup | null>(null)
const all = ref<AdminSetting[]>([])

// === site 表单 ===
const siteForm = reactive({
  site_name: '',
  site_logo: '',
  site_description: '',
  icp: ''
})

// === customer_service 表单 ===
const csForm = reactive({
  customer_service_phone: '',
  customer_service_wechat: '',
  working_hours: ''
})

// === payment 表单 ===
const payMethods = ['wechat', 'alipay'] as const
const payMethodLabels: Record<(typeof payMethods)[number], string> = {
  wechat: '微信支付',
  alipay: '支付宝'
}
const payForm = reactive({
  payment_methods: [] as string[],
  min_order_amount: 0
})

// === shipping 表单 ===
const shipForm = reactive({
  free_shipping_threshold: 0,
  default_shipping_fee: 0,
  supported_regions_text: ''
})

// group → 表单值的映射
function getValue(map: Record<string, unknown>, key: string): unknown {
  return map[key]
}

function loadFromList() {
  const map: Record<string, unknown> = {}
  for (const s of all.value) map[s.key] = s.value

  siteForm.site_name = String(map.site_name ?? '')
  siteForm.site_logo = String(map.site_logo ?? '')
  siteForm.site_description = String(map.site_description ?? '')
  siteForm.icp = String(map.icp ?? '')

  csForm.customer_service_phone = String(map.customer_service_phone ?? '')
  csForm.customer_service_wechat = String(map.customer_service_wechat ?? '')
  csForm.working_hours = String(map.working_hours ?? '')

  const pm = map.payment_methods
  payForm.payment_methods = Array.isArray(pm) ? (pm as string[]) : []
  payForm.min_order_amount = Number(map.min_order_amount ?? 0)

  shipForm.free_shipping_threshold = Number(map.free_shipping_threshold ?? 0)
  shipForm.default_shipping_fee = Number(map.default_shipping_fee ?? 0)
  const regions = map.supported_regions
  shipForm.supported_regions_text = Array.isArray(regions)
    ? (regions as string[]).join('\n')
    : ''
}

async function load() {
  loading.value = true
  try {
    const r = await listAdminSettings()
    all.value = r.list
    loadFromList()
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '加载失败'
    ElMessage.error(msg)
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function saveGroup(group: SettingGroup, updates: Array<{ key: string; value: unknown }>) {
  savingGroup.value = group
  try {
    await bulkUpdateAdminSettings(updates)
    ElMessage.success('已保存')
    await load()
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '保存失败'
    ElMessage.error(msg)
  } finally {
    savingGroup.value = null
  }
}

function saveSite() {
  return saveGroup('site', [
    { key: 'site_name', value: siteForm.site_name },
    { key: 'site_logo', value: siteForm.site_logo },
    { key: 'site_description', value: siteForm.site_description },
    { key: 'icp', value: siteForm.icp }
  ])
}

function saveCs() {
  return saveGroup('customer_service', [
    { key: 'customer_service_phone', value: csForm.customer_service_phone },
    { key: 'customer_service_wechat', value: csForm.customer_service_wechat },
    { key: 'working_hours', value: csForm.working_hours }
  ])
}

function savePayment() {
  return saveGroup('payment', [
    { key: 'payment_methods', value: payForm.payment_methods },
    { key: 'min_order_amount', value: payForm.min_order_amount }
  ])
}

function saveShipping() {
  const regions = shipForm.supported_regions_text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
  return saveGroup('shipping', [
    { key: 'free_shipping_threshold', value: shipForm.free_shipping_threshold },
    { key: 'default_shipping_fee', value: shipForm.default_shipping_fee },
    { key: 'supported_regions', value: regions }
  ])
}

const lastUpdated = computed(() => {
  if (all.value.length === 0) return ''
  const ts = all.value.map((s) => new Date(s.updatedAt).getTime())
  const max = Math.max(...ts)
  return new Date(max).toLocaleString()
})

// 把当前 group 下所有 setting 的 description 显示出来
function descOf(key: string): string | null {
  const s = all.value.find((x) => x.key === key)
  return s?.description ?? null
}
</script>

<template>
  <div class="page">
    <el-card v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>系统设置</span>
          <span class="muted">最近更新：{{ lastUpdated || '-' }}</span>
        </div>
      </template>

      <el-tabs>
        <!-- 站点信息 -->
        <el-tab-pane label="站点信息">
          <el-form label-width="120px" style="max-width: 600px">
            <el-form-item label="站点名称">
              <el-input v-model="siteForm.site_name" placeholder="客户端首页展示" />
              <span v-if="descOf('site_name')" class="hint">{{ descOf('site_name') }}</span>
            </el-form-item>
            <el-form-item label="站点 Logo">
              <el-input v-model="siteForm.site_logo" placeholder="https://..." />
              <span v-if="descOf('site_logo')" class="hint">{{ descOf('site_logo') }}</span>
            </el-form-item>
            <el-form-item label="站点描述">
              <el-input v-model="siteForm.site_description" type="textarea" :rows="2" />
              <span v-if="descOf('site_description')" class="hint">{{ descOf('site_description') }}</span>
            </el-form-item>
            <el-form-item label="ICP 备案">
              <el-input v-model="siteForm.icp" placeholder="如 京ICP备12345678号" />
              <span v-if="descOf('icp')" class="hint">{{ descOf('icp') }}</span>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="savingGroup === 'site'" @click="saveSite">保存</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 客服 -->
        <el-tab-pane label="客服">
          <el-form label-width="120px" style="max-width: 600px">
            <el-form-item label="客服电话">
              <el-input v-model="csForm.customer_service_phone" placeholder="400-xxx-xxxx" />
              <span v-if="descOf('customer_service_phone')" class="hint">{{ descOf('customer_service_phone') }}</span>
            </el-form-item>
            <el-form-item label="客服微信号">
              <el-input v-model="csForm.customer_service_wechat" />
              <span v-if="descOf('customer_service_wechat')" class="hint">{{ descOf('customer_service_wechat') }}</span>
            </el-form-item>
            <el-form-item label="工作时间">
              <el-input v-model="csForm.working_hours" placeholder="9:00-21:00" />
              <span v-if="descOf('working_hours')" class="hint">{{ descOf('working_hours') }}</span>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="savingGroup === 'customer_service'" @click="saveCs">保存</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 支付 -->
        <el-tab-pane label="支付">
          <el-form label-width="120px" style="max-width: 600px">
            <el-form-item label="支付方式">
              <el-checkbox-group v-model="payForm.payment_methods">
                <el-checkbox v-for="m in payMethods" :key="m" :value="m">{{ payMethodLabels[m] }}</el-checkbox>
              </el-checkbox-group>
              <span v-if="descOf('payment_methods')" class="hint">{{ descOf('payment_methods') }}</span>
            </el-form-item>
            <el-form-item label="起送金额">
              <el-input-number v-model="payForm.min_order_amount" :min="0" :step="1" />
              <span class="muted"> 元</span>
              <span v-if="descOf('min_order_amount')" class="hint">{{ descOf('min_order_amount') }}</span>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="savingGroup === 'payment'" @click="savePayment">保存</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 运费 -->
        <el-tab-pane label="运费">
          <el-form label-width="120px" style="max-width: 600px">
            <el-form-item label="免运费门槛">
              <el-input-number v-model="shipForm.free_shipping_threshold" :min="0" :step="1" />
              <span class="muted"> 元（订单金额 ≥ 此值免运费）</span>
              <span v-if="descOf('free_shipping_threshold')" class="hint">{{ descOf('free_shipping_threshold') }}</span>
            </el-form-item>
            <el-form-item label="默认运费">
              <el-input-number v-model="shipForm.default_shipping_fee" :min="0" :step="1" />
              <span class="muted"> 元</span>
              <span v-if="descOf('default_shipping_fee')" class="hint">{{ descOf('default_shipping_fee') }}</span>
            </el-form-item>
            <el-form-item label="支持地区">
              <el-input
                v-model="shipForm.supported_regions_text"
                type="textarea"
                :rows="3"
                placeholder="一行一个地区"
              />
              <span v-if="descOf('supported_regions')" class="hint">{{ descOf('supported_regions') }}</span>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="savingGroup === 'shipping'" @click="saveShipping">保存</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 12px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.muted { color: #909399; font-size: 12px; }
.hint { color: #909399; font-size: 12px; display: block; margin-top: 4px; }
</style>

