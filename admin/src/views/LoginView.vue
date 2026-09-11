<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { useAdminAuthStore } from '../stores/admin-auth'

const route = useRoute()
const router = useRouter()
const auth = useAdminAuthStore()

const form = reactive({ username: 'admin', password: '' })
const submitting = ref(false)
const formRef = ref()

async function onSubmit() {
  await formRef.value?.validate()
  submitting.value = true
  try {
    await auth.login(form)
    ElMessage.success('登录成功')
    const redirect = (route.query.redirect as string) || '/dashboard'
    router.replace(redirect)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '登录失败'
    try {
        const parsed = JSON.parse(msg)
        ElMessage.error(parsed.message || '登录失败')
      } catch {
        ElMessage.error(msg)
      }
  } finally {
    submitting.value = false
  }
}

const rules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="brand">
        <div class="brand-mark">M</div>
        <div class="brand-text">
          <div class="title">商城管理后台</div>
          <div class="subtitle">mymobilepage · admin</div>
        </div>
      </div>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        size="large"
        @submit.prevent="onSubmit"
      >
        <el-form-item prop="username">
          <el-input
            v-model="form.username"
            placeholder="账号"
            :prefix-icon="User"
            clearable
          />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码"
            :prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        <el-button
          type="primary"
          :loading="submitting"
          class="submit"
          @click="onSubmit"
        >
          登录
        </el-button>
      </el-form>

      <div class="hint">
        默认管理员：<code>admin</code> · 密码：<code>admin123</code>
      </div>
    </div>

    <div class="footer">© 2026 mymobilepage</div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  padding: 24px;
}
.login-card {
  width: 100%;
  max-width: 380px;
  background: #fff;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
}
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}
.brand-mark {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: #409eff;
  color: #fff;
  font-weight: 700;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.brand-text .title {
  font-size: 18px;
  font-weight: 600;
}
.brand-text .subtitle {
  font-size: 12px;
  color: #909399;
}
.submit {
  width: 100%;
  height: 44px;
  font-size: 15px;
}
.hint {
  text-align: center;
  color: #909399;
  font-size: 12px;
  margin-top: 16px;
}
.hint code {
  background: #f5f7fa;
  padding: 1px 6px;
  border-radius: 3px;
  font-family: ui-monospace, monospace;
}
.footer {
  margin-top: 24px;
  color: rgba(255,255,255,0.7);
  font-size: 12px;
}
</style>