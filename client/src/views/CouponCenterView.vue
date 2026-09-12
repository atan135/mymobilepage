<script setup lang="ts">
import 'vant/es/toast/index.css'
import { computed, onMounted, reactive, ref } from 'vue'
import { showToast } from 'vant'
import {
  listAvailableCoupons,
  listMyCoupons,
  claimCoupon,
  type AvailableCoupon,
  type UserCoupon
} from '../api/coupon'
import { errorMessage } from '../api/request'

const loading = ref(false)
const available = ref<AvailableCoupon[]>([])
const mineList = ref<UserCoupon[]>([])

const activeTab = ref<'available' | 'mine'>('available')

const mineFilter = reactive({
  status: 0,
  page: 1,
  pageSize: 20,
  total: 0,
  finished: false
})

function typeLabel(t: number) {
  return ({ 1: '满减券', 2: '折扣券', 3: '代金券' } as Record<number, string>)[t] ?? '优惠券'
}

function formatAmount(c: { type: number; amount: number }) {
  if (c.type === 2) return `${c.amount}%`
  return `¥${c.amount.toFixed(2)}`
}

function thresholdText(t: number | null) {
  if (t === null || t === undefined) return '无门槛'
  return `满 ¥${t.toFixed(2)} 可用`
}

const STATUS_LABEL: Record<number, string> = { 0: '未使用', 1: '已使用', 2: '已过期' }

async function loadAvailable() {
  loading.value = true
  try {
    available.value = await listAvailableCoupons()
  } catch (e: unknown) {
    const msg = errorMessage(e, '加载失败')
    showToast(msg)
  } finally {
    loading.value = false
  }
}

async function loadMine(reset = true) {
  if (reset) {
    mineFilter.page = 1
    mineFilter.finished = false
    mineList.value = []
  }
  loading.value = true
  try {
    const r = await listMyCoupons({
      status: mineFilter.status,
      page: mineFilter.page,
      pageSize: mineFilter.pageSize
    })
    mineList.value = reset ? r.list : [...mineList.value, ...r.list]
    mineFilter.total = r.total
    if (!r.hasMore) mineFilter.finished = true
  } catch (e: unknown) {
    const msg = errorMessage(e, '加载失败')
    showToast(msg)
  } finally {
    loading.value = false
  }
}

async function onTabChange(name: string | number) {
  if (name === 'available') await loadAvailable()
  else await loadMine(true)
}

async function onStatusChange(s: number) {
  mineFilter.status = s
  await loadMine(true)
}

async function onClaim(c: AvailableCoupon) {
  try {
    await claimCoupon(c.id)
    showToast(`已领取「${c.name}」`)
    await loadAvailable()
  } catch (e: unknown) {
    const msg = errorMessage(e, '领取失败')
    showToast(msg)
  }
}

async function loadMore() {
  if (mineFilter.finished || loading.value) return
  mineFilter.page += 1
  await loadMine(false)
}

async function refresh() {
  if (activeTab.value === 'available') await loadAvailable()
  else await loadMine(true)
}

onMounted(loadAvailable)

const mineStatusTabs = [
  { name: 0, label: '未使用' },
  { name: 1, label: '已使用' },
  { name: 2, label: '已过期' }
]

const fmtDate = (s: string) => new Date(s).toLocaleDateString()
</script>

<template>
  <div class="page">
    <van-nav-bar title="领券中心" left-arrow fixed @click-left="$router.back()" />

    <div class="content">
      <van-tabs v-model:active="activeTab" sticky @change="onTabChange">
        <!-- 可领取 -->
        <van-tab title="可领取" name="available">
          <div v-if="loading && available.length === 0" class="empty">加载中...</div>
          <div v-else-if="available.length === 0" class="empty">
            <van-empty description="暂无可领取的优惠券" />
          </div>
          <div v-else class="list">
            <div v-for="c in available" :key="c.id" class="coupon">
              <div class="left">
                <div class="amount">
                  <template v-if="c.type === 2">
                    <span class="num">{{ c.amount }}</span>
                    <span class="unit">%</span>
                  </template>
                  <template v-else>
                    <span class="prefix">¥</span>
                    <span class="num">{{ c.amount.toFixed(0) }}</span>
                  </template>
                </div>
                <div class="threshold">{{ thresholdText(c.threshold) }}</div>
              </div>
              <div class="right">
                <div class="name">{{ c.name }}</div>
                <div class="meta">
                  剩余 {{ c.remaining }} / {{ c.total }}
                  <span v-if="c.received" class="muted">· 已领取</span>
                </div>
                <div class="meta muted">
                  有效期至 {{ fmtDate(c.validTo) }}
                </div>
                <van-button
                  v-if="!c.received"
                  round
                  size="small"
                  type="danger"
                  class="claim"
                  @click="onClaim(c)"
                >
                  立即领取
                </van-button>
                <van-button
                  v-else
                  round
                  size="small"
                  plain
                  disabled
                  class="claim"
                >
                  已领取
                </van-button>
              </div>
            </div>
          </div>
        </van-tab>

        <!-- 我的优惠券 -->
        <van-tab title="我的优惠券" name="mine">
          <van-tabs
            v-model:active="mineFilter.status"
            type="card"
            shrink
            @change="onStatusChange"
          >
            <van-tab
              v-for="t in mineStatusTabs"
              :key="t.name"
              :title="t.label"
              :name="t.name"
            />
          </van-tabs>

          <div v-if="loading && mineList.length === 0" class="empty">加载中...</div>
          <div v-else-if="mineList.length === 0" class="empty">
            <van-empty
              :description="`暂无${STATUS_LABEL[mineFilter.status]}优惠券`"
            />
          </div>
          <div v-else class="list">
            <div
              v-for="uc in mineList"
              :key="uc.id"
              class="coupon"
              :class="{ used: uc.status === 1, expired: uc.status === 2 }"
            >
              <div class="left">
                <div class="amount">
                  <template v-if="uc.coupon.type === 2">
                    <span class="num">{{ uc.coupon.amount }}</span>
                    <span class="unit">%</span>
                  </template>
                  <template v-else>
                    <span class="prefix">¥</span>
                    <span class="num">{{ uc.coupon.amount.toFixed(0) }}</span>
                  </template>
                </div>
                <div class="threshold">{{ thresholdText(uc.coupon.threshold) }}</div>
              </div>
              <div class="right">
                <div class="name">{{ uc.coupon.name }}</div>
                <div class="meta">
                  {{ typeLabel(uc.coupon.type) }}
                  <span class="muted">
                    · {{ uc.source === 1 ? '后台发放' : '主动领取' }}
                  </span>
                </div>
                <div class="meta muted">
                  有效期至 {{ uc.expiresAt ? fmtDate(uc.expiresAt) : '-' }}
                </div>
                <div v-if="uc.status === 1 && uc.orderId" class="meta muted">
                  使用于订单 #{{ uc.orderId }}
                </div>
              </div>
            </div>
          </div>
        </van-tab>
      </van-tabs>
    </div>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #f7f8fa;
}
.content {
  padding: 46px 0 24px;
}
.empty {
  padding: 32px 0;
  color: #969799;
  text-align: center;
}
.list {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.coupon {
  display: flex;
  background: linear-gradient(135deg, #ee0a24, #ff5b5b);
  border-radius: 10px;
  overflow: hidden;
  color: #fff;
  box-shadow: 0 2px 8px rgba(238, 10, 36, 0.18);
}
.coupon.used,
.coupon.expired {
  background: #c8c9cc;
  box-shadow: none;
}
.left {
  flex: 0 0 110px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px 8px;
  border-right: 1px dashed rgba(255, 255, 255, 0.5);
}
.amount {
  display: flex;
  align-items: baseline;
  color: #fff;
}
.prefix {
  font-size: 14px;
  margin-right: 2px;
}
.num {
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
}
.unit {
  font-size: 14px;
  margin-left: 2px;
}
.threshold {
  font-size: 12px;
  margin-top: 6px;
  opacity: 0.9;
  text-align: center;
}
.right {
  flex: 1;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  position: relative;
}
.name {
  font-size: 14px;
  font-weight: 600;
}
.meta {
  font-size: 12px;
  opacity: 0.9;
}
.muted {
  opacity: 0.7;
}
.claim {
  position: absolute;
  right: 12px;
  bottom: 10px;
}
</style>