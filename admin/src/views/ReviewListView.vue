<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  listAdminReviews,
  REVIEW_RATINGS,
  REVIEW_STATUSES,
  REVIEW_STATUS_LABELS,
  REVIEW_STATUS_TAG_TYPE,
  type AdminReviewListItem,
  type ReviewRating,
  type ReviewStatus
} from '../api/admin-reviews'

const router = useRouter()
const loading = ref(false)
const list = ref<AdminReviewListItem[]>([])
const total = ref(0)

const query = reactive({
  status: undefined as ReviewStatus | undefined,
  rating: undefined as ReviewRating | undefined,
  keyword: '',
  page: 1,
  pageSize: 10
})

const tabs = [
  { label: '全部', value: undefined },
  ...REVIEW_STATUSES.map((s) => ({ label: REVIEW_STATUS_LABELS[s], value: s }))
]

const ratingTabs = [
  { label: '全部', value: undefined },
  ...REVIEW_RATINGS.map((r) => ({ label: `${r} 星`, value: r }))
]

async function load() {
  loading.value = true
  try {
    const r = await listAdminReviews({
      status: query.status,
      rating: query.rating,
      keyword: query.keyword || undefined,
      page: query.page,
      pageSize: query.pageSize
    })
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

function onTabChange() {
  query.page = 1
  load()
}

function onRatingTabChange() {
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
  query.rating = undefined
  query.page = 1
  load()
}

function openDetail(row: AdminReviewListItem) {
  router.push({ name: 'admin-review-detail', params: { id: String(row.id) } })
}

function stars(n: number): string {
  return '★★★★★☆☆☆☆☆'.slice(5 - n, 10 - n)
}

function asReview(row: unknown): AdminReviewListItem {
  return row as AdminReviewListItem
}

const activeStatus = computed(() => String(query.status ?? ''))
const activeRating = computed(() => String(query.rating ?? ''))
</script>

<template>
  <div class="page">
    <el-card>
      <el-tabs :model-value="activeStatus" @tab-change="(name: string | number) => { query.status = name === '' ? undefined : (Number(name) as ReviewStatus); onTabChange(); }">
        <el-tab-pane
          v-for="t in tabs"
          :key="String(t.value ?? '')"
          :label="t.label"
          :name="String(t.value ?? '')"
        />
      </el-tabs>

      <el-tabs :model-value="activeRating" type="card" class="rating-tabs" @tab-change="(name: string | number) => { query.rating = name === '' ? undefined : (Number(name) as ReviewRating); onRatingTabChange(); }">
        <el-tab-pane
          v-for="t in ratingTabs"
          :key="String(t.value ?? '')"
          :label="t.label"
          :name="String(t.value ?? '')"
        />
      </el-tabs>

      <el-form :inline="true" :model="query" class="filter">
        <el-form-item label="搜索">
          <el-input
            v-model="query.keyword"
            placeholder="评价内容 / 商品标题 / 用户名"
            clearable
            style="width: 260px"
            @keyup.enter="onSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onSearch">查询</el-button>
          <el-button @click="onReset">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="loading" :data="list" stripe>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column label="商品" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="product-cell">
              <el-image
                :src="asReview(row).product.cover"
                style="width: 40px; height: 40px; border-radius: 4px; flex: 0 0 40px"
                fit="cover"
              />
              <span class="product-title">{{ asReview(row).product.title }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="用户" min-width="140">
          <template #default="{ row }">
            <template v-if="asReview(row).user">
              {{ asReview(row).user.nickname ?? asReview(row).user.username }}
              <span class="muted">@{{ asReview(row).user.username }}</span>
            </template>
            <span v-else class="muted">-</span>
          </template>
        </el-table-column>
        <el-table-column label="评分" width="110">
          <template #default="{ row }">
            <span class="stars" :title="`${asReview(row).rating} 星`">{{ stars(asReview(row).rating) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="内容" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            {{ asReview(row).content }}
            <span v-if="asReview(row).reply" class="reply-hint">（已回复）</span>
          </template>
        </el-table-column>
        <el-table-column label="图片" width="80">
          <template #default="{ row }">
            <span v-if="asReview(row).images.length">{{ asReview(row).images.length }} 张</span>
            <span v-else class="muted">-</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="REVIEW_STATUS_TAG_TYPE[asReview(row).status]">
              {{ REVIEW_STATUS_LABELS[asReview(row).status] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="提交时间" width="180">
          <template #default="{ row }">
            {{ new Date(asReview(row).createdAt).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button v-permission="'review:detail'" link type="primary" @click="openDetail(asReview(row))">
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="query.page"
        v-model:page-size="query.pageSize"
        :page-sizes="[10, 20, 50]"
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
.filter { margin-bottom: 12px; }
.rating-tabs { margin-bottom: 12px; }
.muted { color: #909399; font-size: 12px; margin-left: 4px; }
.stars { color: #f7ba2e; letter-spacing: 1px; }
.reply-hint { color: #67c23a; font-size: 12px; margin-left: 6px; }
.product-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}
.product-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>