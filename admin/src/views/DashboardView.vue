<script setup lang="ts">
import { onMounted } from 'vue'
import { useAdminAuthStore } from '../stores/admin-auth'

const auth = useAdminAuthStore()

onMounted(async () => {
  if (auth.isLoggedIn && !auth.user) {
    try {
      await auth.fetchProfile()
    } catch {
      /* token 失效就放着，后续拦截器会处理 */
    }
  }
})
</script>

<template>
  <div class="dashboard">
    <el-card class="welcome">
      <h2>欢迎，{{ auth.user?.nickname ?? auth.user?.username ?? 'Admin' }}</h2>
      <p class="meta">
        角色：<el-tag>{{ auth.user?.role ?? '-' }}</el-tag>
        <span class="sep">·</span>
        账号：{{ auth.user?.username ?? '-' }}
      </p>
      <p class="hint">
        Phase 1 · 迭代 #1 脚手架已就绪。后续迭代将逐步接入：
        <br />· 用户管理 / 商品 + 分类 / 订单 / 轮播图 / 公告 / 仪表盘聚合数据
      </p>
    </el-card>

    <el-row :gutter="16" class="kpis">
      <el-col :span="6">
        <el-card>
          <div class="kpi-label">今日订单</div>
          <div class="kpi-value">--</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <div class="kpi-label">今日 GMV</div>
          <div class="kpi-value">--</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <div class="kpi-label">注册用户</div>
          <div class="kpi-value">--</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <div class="kpi-label">待处理订单</div>
          <div class="kpi-value">--</div>
        </el-card>
      </el-col>
    </el-row>
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
.hint {
  margin-top: 16px;
  color: #909399;
  font-size: 13px;
  line-height: 1.7;
  background: #f5f7fa;
  padding: 12px 16px;
  border-radius: 6px;
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
</style>