<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useUserStore } from '../stores/user'
import { errorMessage } from '../api/request'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const form = reactive({ username: '', password: '' })
const submitting = ref(false)

async function onSubmit() {
  if (!form.username || !form.password) {
    showToast('请输入用户名和密码')
    return
  }
  submitting.value = true
  try {
    await userStore.login(form)
    showToast({ type: 'success', message: '登录成功' })
    const redirect = (route.query.redirect as string) || '/home'
    router.replace(redirect)
  } catch (e: unknown) {
    const msg = errorMessage(e, '登录失败')
    showToast(msg)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="login">
    <div class="hero">
      <div class="logo">M</div>
      <div class="title">我的商城</div>
      <div class="subtitle">登录后开始购物</div>
    </div>

    <van-form @submit="onSubmit" class="form">
      <van-cell-group inset>
        <van-field
          v-model="form.username"
          name="username"
          label="用户名"
          placeholder="请输入用户名"
          :rules="[{ required: true, message: '请输入用户名' }]"
          clearable
        />
        <van-field
          v-model="form.password"
          type="password"
          name="password"
          label="密码"
          placeholder="请输入密码"
          :rules="[{ required: true, message: '请输入密码' }]"
        />
      </van-cell-group>

      <div class="submit">
        <van-button
          round
          block
          type="primary"
          native-type="submit"
          :loading="submitting"
          loading-text="登录中..."
        >
          登录
        </van-button>
      </div>

    </van-form>
  </div>
</template>

<style scoped>
.login {
  min-height: 100vh;
  background: linear-gradient(180deg, #fff 0%, #f7f8fa 60%);
  padding: 80px 16px 24px;
  box-sizing: border-box;
}
.hero {
  text-align: center;
  margin-bottom: 40px;
}
.logo {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: var(--van-primary-color);
  color: #fff;
  font-size: 32px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}
.title {
  font-size: 22px;
  font-weight: 600;
}
.subtitle {
  margin-top: 6px;
  color: #969799;
  font-size: 14px;
}
.form {
  margin-top: 12px;
}
.submit {
  margin: 24px 16px 0;
}
</style>