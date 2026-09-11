import type { Directive, DirectiveBinding } from 'vue'
import { useAdminAuthStore } from '../stores/admin-auth'

/**
 * 用法：<el-button v-permission="'user:create'">新建</el-button>
 *
 * - 不传值：仅要求已登录
 * - 传字符串：要求拥有该权限
 * - 传字符串数组：要求拥有数组中任一权限
 */
const permission: Directive<HTMLElement, string | string[] | undefined> = {
  mounted(el: HTMLElement, binding: DirectiveBinding<string | string[] | undefined>) {
    const auth = useAdminAuthStore()
    const { value } = binding

    if (!auth.isLoggedIn) {
      hide(el)
      return
    }

    if (value === undefined) return

    const allowed = Array.isArray(value)
      ? value.some((p) => auth.hasPermission(p))
      : auth.hasPermission(value)

    if (!allowed) hide(el)
  }
}

function hide(el: HTMLElement): void {
  el.parentElement?.removeChild(el)
}

export default permission