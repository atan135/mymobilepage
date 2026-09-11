/**
 * 权限字符串统一在这里定义，避免前后端拼写不一致。
 *
 * 约定：{module}:{action}
 *
 * - * 表示超级管理员，拥有所有权限（角色 permissions 包含 '*' 时直接放行）
 */
export type AdminPermission =
  | '*'
  | 'dashboard:view'
  | 'user:list' | 'user:detail' | 'user:edit' | 'user:disable'
  | 'product:list' | 'product:create' | 'product:edit' | 'product:delete'
  | 'product:on_off' | 'product:adjust_stock'
  | 'category:list' | 'category:create' | 'category:edit' | 'category:delete'
  | 'order:list' | 'order:detail' | 'order:ship' | 'order:cancel'
  | 'banner:list' | 'banner:create' | 'banner:edit' | 'banner:delete'
  | 'announcement:list' | 'announcement:create' | 'announcement:edit' | 'announcement:delete' | 'announcement:publish'
  | 'coupon:list' | 'coupon:create' | 'coupon:edit' | 'coupon:on_off' | 'coupon:delete' | 'coupon:grant' | 'inventory:list' | 'inventory:warning' | 'review:list' | 'review:detail' | 'review:approve' | 'review:block' | 'review:reply' | 'refund:list' | 'refund:detail' | 'refund:approve' | 'refund:reject' | 'refund:refund'
  | 'export:*' | 'audit:view' | 'setting:edit'


