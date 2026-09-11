<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  approveAdminReview,
  blockAdminReview,
  getAdminReview,
  replyAdminReview,
  REVIEW_STATUS_LABELS,
  REVIEW_STATUS_TAG_TYPE,
  type AdminReviewDetail
} from '../api/admin-reviews'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const detail = ref<AdminReviewDetail | null>(null)

const replyDraft = ref('')
const replyVisible = ref(false)

async function load() {
  loading.value = true
  try {
    detail.value = await getAdminReview(Number(route.params.id))
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '加载失败'
    ElMessage.error(msg)
  } finally {
    loading.value = false
  }
}

onMounted(load)

function back() {
  router.push({ name: 'admin-reviews' })
}

function stars(n: number): string {
  return '★★★★★☆☆☆☆☆'.slice(5 - n, 10 - n)
}

async function onApprove() {
  if (!detail.value) return
  try {
    await ElMessageBox.confirm(
      `确认通过评价 #${detail.value.id}？通过后会展示在客户端。`,
      '提示',
      { type: 'warning' }
    )
  } catch {
    return
  }
  await approveAdminReview(detail.value.id)
  ElMessage.success('已通过')
  await load()
}

async function onBlock() {
  if (!detail.value) return
  try {
    await ElMessageBox.confirm(
      `确认屏蔽评价 #${detail.value.id}？屏蔽后将不在客户端展示。`,
      '提示',
      { type: 'warning' }
    )
  } catch {
    return
  }
  await blockAdminReview(detail.value.id)
  ElMessage.success('已屏蔽')
  await load()
}

function openReply() {
  replyDraft.value = detail.value?.reply ?? ''
  replyVisible.value = true
}

async function submitReply() {
  if (!detail.value) return
  const trimmed = replyDraft.value.trim()
  await replyAdminReview(detail.value.id, trimmed)
  ElMessage.success(trimmed === '' ? '已清除回复' : '回复已保存')
  replyVisible.value = false
  await load()
}

const canApprove = computed(() => detail.value?.status === 0)
const canBlock = computed(() => detail.value?.status === 0 || detail.value?.status === 1)
const canRestore = computed(() => detail.value?.status === 2)
</script>

<template>
  <div class="page">
    <el-card v-loading="loading">
      <div class="header">
        <el-button link @click="back">← 返回列表</el-button>
        <h2 class="title">评价详情 #{{ detail?.id ?? '-' }}</h2>
        <el-tag v-if="detail" :type="REVIEW_STATUS_TAG_TYPE[detail.status]" size="large">
          {{ REVIEW_STATUS_LABELS[detail.status] }}
        </el-tag>
      </div>

      <template v-if="detail">
        <el-descriptions :column="2" border class="block">
          <el-descriptions-item label="评价 ID">{{ detail.id }}</el-descriptions-item>
          <el-descriptions-item label="评分">
            <span class="stars">{{ stars(detail.rating) }}</span>
            <span class="muted">{{ detail.rating }} / 5</span>
          </el-descriptions-item>
          <el-descriptions-item label="提交时间">
            {{ new Date(detail.createdAt).toLocaleString() }}
          </el-descriptions-item>
          <el-descriptions-item label="更新时间">
            {{ new Date(detail.updatedAt).toLocaleString() }}
          </el-descriptions-item>
        </el-descriptions>

        <h4 class="block-title">评价用户</h4>
        <el-descriptions :column="2" border class="block">
          <el-descriptions-item label="用户 ID">{{ detail.user.id }}</el-descriptions-item>
          <el-descriptions-item label="用户名">
            {{ detail.user.username }}
            <span class="muted" v-if="detail.user.nickname">（{{ detail.user.nickname }}）</span>
          </el-descriptions-item>
          <el-descriptions-item label="手机号" :span="2">
            {{ detail.user.phone ?? '-' }}
          </el-descriptions-item>
        </el-descriptions>

        <h4 class="block-title">商品信息</h4>
        <div class="product">
          <el-image
            :src="detail.product.cover"
            style="width: 64px; height: 64px; border-radius: 6px; flex: 0 0 64px"
            fit="cover"
          />
          <div class="product-meta">
            <div class="product-title">{{ detail.product.title }}</div>
            <div class="muted">商品 ID: {{ detail.product.id }}</div>
          </div>
        </div>

        <h4 class="block-title">评价内容</h4>
        <div class="content">{{ detail.content }}</div>

        <template v-if="detail.images.length">
          <h4 class="block-title">评价图片</h4>
          <div class="images">
            <el-image
              v-for="(img, idx) in detail.images"
              :key="idx"
              :src="img"
              :initial-index="idx"
              :preview-src-list="detail.images"
              style="width: 96px; height: 96px; border-radius: 4px"
              fit="cover"
              class="thumb"
            />
          </div>
        </template>

        <h4 class="block-title">商家回复</h4>
        <el-descriptions :column="1" border class="block">
          <el-descriptions-item>
            <template v-if="detail.reply">
              {{ detail.reply }}
            </template>
            <span v-else class="muted">暂无回复</span>
          </el-descriptions-item>
        </el-descriptions>

        <div class="actions">
          <el-button v-if="canApprove" v-permission="'review:approve'" type="success" @click="onApprove">
            通过
          </el-button>
          <el-button v-if="canBlock" v-permission="'review:block'" type="danger" plain @click="onBlock">
            屏蔽
          </el-button>
          <el-button v-if="canRestore" v-permission="'review:approve'" type="success" @click="onApprove">
            恢复为通过
          </el-button>
          <el-button v-permission="'review:reply'" type="primary" plain @click="openReply">
            {{ detail.reply ? '编辑回复' : '写回复' }}
          </el-button>
        </div>
      </template>
    </el-card>

    <el-dialog
      v-model="replyVisible"
      :title="detail?.reply ? '编辑回复' : '写回复'"
      width="480px"
    >
      <el-form label-width="80px">
        <el-form-item label="回复内容">
          <el-input
            v-model="replyDraft"
            type="textarea"
            :rows="4"
            maxlength="1000"
            show-word-limit
            placeholder="留空将清除回复"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="replyVisible = false">取消</el-button>
        <el-button type="primary" @click="submitReply">保存</el-button>
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
.muted { color: #909399; font-size: 12px; margin-left: 6px; }
.stars { color: #f7ba2e; letter-spacing: 1px; margin-right: 6px; }
.product {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border: 1px solid var(--app-border-color);
  border-radius: 4px;
  background: var(--app-bg-soft);
}
.product-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.product-title {
  font-size: 14px;
}
.content {
  padding: 12px;
  border: 1px solid var(--app-border-color);
  border-radius: 4px;
  background: var(--app-bg-soft);
  white-space: pre-wrap;
  word-break: break-word;
}
.images {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.thumb { cursor: zoom-in; }
.actions {
  display: flex;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid var(--app-border-color);
  margin-top: 16px;
}
</style>