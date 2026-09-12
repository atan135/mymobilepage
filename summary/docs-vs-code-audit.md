# docs-vs-code 一致性审查报告

> 范围：`docs/` 全部 29 篇，对照 `client/`、`admin/`、`server/`、`prisma/`、`package.json` 实际代码。
>
> 审查方式：3 个并行子任务分块审 + 关键事实交叉复核（`Vant` 版本、`/api/admin` 路由、`v-permission` 实现、状态机表、迁移历史、`seed.ts` 权限码、`prisma:deploy` 命令、`.env.example` 等）。
>
> **总体结论**：文档整体停留在 **Phase 1 完成态**，但代码已 **Phase 1 + Phase 2 全部完成**；AGENTS.md §7 自相矛盾——一方面把 `client/src/api/request.ts` mock 注释、`LoginView.vue`「演示版」文案列为「已过时」坑位，另一方面这些内容**至今仍在代码中**。共发现 **54 处不一致**（High 17 / Medium 14 / Low 11），其中 10 条为强烈推荐先修。

---

## 严重程度索引

- 高严重度：H1 – H17（17 条）
- 中严重度：M1 – M14（14 条）
- 低严重度：L1 – L11（11 条）

---

---

## 修复进度（截至本次提交）

**已修复条目**：H1-H17、M1-M14、L1-L11 全部 42 条 + 附录 A 1 条 = **共 43 条**。

剩余：**附录 B** 中提到的"延后项"——仅 ECharts 销售趋势切换控件为 UI 占位、非紧急，可在后续 Phase 3 跟进；User.status 字段补 schema 已在「修复进度（续）」闭环（见下）。

修复顺序按"强烈推荐先修 10 条"权重从高到低：

| # | 条目 | 提交类型 | 备注 |
| --- | --- | --- | --- |
| 1 | H5 系统设置四方权限码 | fix(admin) | router/layout `setting:edit` -> `setting:list` |
| 2 | H10/H11 AGENTS §7 自点名 | fix(client) | 删除 request.ts mock 注释 + LoginView 演示文案 |
| 3 | H1/H2/H8/H15 Phase 2 完成态 | docs(server/admin/client) | 补模块/表/视图/页面 |
| 4 | H3/L5/L9 状态 5 + 字段 | fix(admin) + docs | ORDER_STATUSES 加 5；文档同步 |
| 5 | H4 ADMIN 权限码 | docs(server/00/10) | seed.ts 作真相源，更新 3 处 |
| 6 | H12 Vant 版本号 | docs(AGENTS/client) | Vant 5 -> Vant 4 |
| 7 | H14 `/order/success?orderNo` -> `?id` | docs(client) | 改 02/04/05 三处 |
| 8 | M10/M11 部署 env + Prisma | docs(deploy) | 补 3 个 env + prisma:deploy 命令 |
| 9 | H6/M14/M12/L1 中间件/迁移/seed | docs(server) | AuditInterceptor 状态 + 迁移表 + seed 步骤 |
| 10 | L2 admin-users User.status | fix(server) | 移除 where.status 字段过滤（应急） |
| + | 附录 A AdminExportsModule 未挂载 | fix(server) | 注册到 app.module.ts imports |

每条修复均按 AGENTS.md"一事一提交"原则拆为独立 commit：
- 代码 commit：fix(admin/client/server)
- 文档 commit：docs(server/admin/client/deploy) 或 docs(AGENTS.md)
- summary commit：docs(summary)

### 修复进度（续）— User.status 完整闭环

之前 L2「admin-users User.status」只是把 `where.status` 过滤临时移除避免 Prisma 抛 `Unknown argument`，
schema 缺口未补；附录 B 中标注为「Phase 3 跟进」的 `User.status` 字段补 schema 项在本次一并闭环：

| commit | 内容 |
| --- | --- |
| `97495dc` `feat(server): users 表加 status 字段 + 重新启用 AdminUsersService 过滤` | `schema.prisma` User 加 `status Int @default(1)`；新增迁移 `20260912000322_phase2_add_user_status/`（`ALTER TABLE users ADD COLUMN status INTEGER NOT NULL DEFAULT 1`）；`AdminUsersService.list` 恢复 `where.status` 过滤分支 |
| `4acfe4e` `docs(server): 同步 User.status 字段（Schema + 迁移表 + 用户管理边界）` | `docs/10-服务端/03-数据库Schema说明.md` §3 users 字段表 + ER 图 + 迁移历史表；`docs/10-服务端/06-数据迁移与Seed脚本.md` §2 迁移表；`docs/20-管理后台/04-用户管理.md` §8 边界说明更新 |
| `937df9d` `docs: AGENTS.md §7 坑位 #3 标记为已修` | AGENTS.md §7 已知坑位 #3 同步为已落地，仅 `AuthService.login` 禁用态校验标记为后续生产化阶段 |

**最终态**：

- 已修复条目：H1-H17、M1-M14、L1-L11 全部 42 条 + 附录 A 1 条 + 附录 B-E（User.status schema 闭环）1 条 = **共 44 条**
- 附录 B 剩余事项：A 整体方案 / B 任务卡拆分 / C 单类优先 / D AdminExportsService 内部复核 — 均属流程或后续优化项，非具体 bug 修复，不再单列 commit
- 未完成项：仅 `server/src/auth/auth.service.ts` 暂未加 `user.status !== 1` 的登录拦截（不影响数据正确性，仅未阻断禁用用户登录），属于生产化阶段事项

---



## 高严重度（High）

✅ (已修复) ### H1. 服务端模块清单严重过时（14 vs 25）

**文档位置**：
- `docs/00-总览与入门/03-架构与目录结构.md` §5「服务端 14 个模块」
- `docs/10-服务端/02-模块总览.md` §1「模块清单」表（15 个）

**文档原文**（02 §1）：
> `PrismaModule` / `AuthModule` / `UsersModule` / `CategoriesModule` / `ProductsModule` / `ClientBannersModule` / `ClientOrdersModule` / `AdminAuthModule` / `AdminUsersModule` / `AdminCategoriesModule` / `AdminProductsModule` / `AdminBannersModule` / `AdminAnnouncementsModule` / `AdminOrdersModule` / `AdminDashboardModule`

**代码事实**：`server/src/app.module.ts` 第 17–49 行导入 27 个模块（`ConfigModule` + `PrismaModule` + 25 个业务模块）。

**未在文档中列出的模块**（11 个）：
- `AdminCouponsModule`（`server/src/admin-coupons/`）
- `AdminRefundsModule`（`server/src/admin-refunds/`）
- `AdminReviewsModule`（`server/src/admin-reviews/`）
- `AdminInventoryModule`（`server/src/admin-inventory/`）
- `InventoryModule`（`server/src/inventory/`）
- `AuditModule`（`server/src/audit/`）
- `AdminAuditLogsModule`（`server/src/admin-audit-logs/`）
- `AdminSettingsModule`（`server/src/admin-settings/`）
- `ClientSettingsModule`（`server/src/client-settings/`）
- `CouponsModule`（`server/src/coupons/`，前台 `/api/coupons`）
- `RefundsModule`（`server/src/refunds/`，前台 `/api/refunds`）

**额外注意**：`AdminExportsModule`（`server/src/admin-exports/`）目录与 module 文件**存在**，但 **未在 `app.module.ts` 注册**——属于真实功能未挂载问题。

**修改建议**：把 Phase 2 完成的 11 个模块补到 §5 列表，并新增对应小节。

---

✅ (已修复) ### H2. 数据库表清单严重过时（10 vs 16）

**文档位置**：
- `docs/10-服务端/03-数据库Schema说明.md` §1「Phase 1 完成后共 **10 张表**」
- `docs/00-总览与入门/03-架构与目录结构.md` §6「数据库表一览」

**文档原文**：users / admin_users / admin_roles / categories / products / banners / announcements / orders / order_items / refund_requests。

**代码事实**：`server/prisma/schema.prisma` 定义了 16 张 model。`server/prisma/migrations/` 实际有 **9 个**迁移文件夹：
```
20260911055156_init
20260911063637_phase1_admin_and_orders
20260911120815_phase2_coupons
20260911125900_phase2_reviews
20260911132309_phase2_inventory
20260911134947_phase2_audit_logs
20260911143048_phase2_settings
20260912000000_phase2_add_refunded_at
20260912000001_phase2_add_review_order_id
```

**未列出的表**（6 张）：`coupons` / `user_coupons` / `reviews` / `inventory_logs` / `audit_logs` / `settings`。

**`orders` 表实际多出的字段**（文档未提）：
- `refunded_at`（迁移 `20260912000000_phase2_add_refunded_at` 新增）
- `original_amount` / `discount_amount`（迁移 `20260911120815_phase2_coupons` 新增）
- `coupons UserCoupon[]` / `reviews Review[]` 反向关联

**`products` 表实际多出的字段**：
- `threshold Int @default(10)`（迁移 `20260911132309_phase2_inventory` 新增，`schema.prisma:42`）
- `reviews Review[]` / `inventoryLogs InventoryLog[]` 反向关联

**`users` 表实际多出的关联**：`coupons UserCoupon[]` / `reviews Review[]`。

**`AdminUser` 表实际多出的关联**：`inventoryLogs InventoryLog[]` / `auditLogs AuditLog[]`。

**`reviews` 表实际多出的字段**：`order_id`（迁移 `20260912000001_phase2_add_review_order_id` 新增）。

**修改建议**：把 03 §1 / §2 / §3 表清单更新到 16 张 + 新增字段；补充 ER 图新增关系。

---

✅ (已修复) ### H3. 订单状态枚举少一个状态（5 vs 6），状态机缺两条边

**文档位置**：
- `docs/10-服务端/03-数据库Schema说明.md` §3 `orders`（只列 0–4）
- `docs/10-服务端/02-模块总览.md` §「AdminOrdersModule」状态机表
- `docs/20-管理后台/06-订单管理.md` §3 `ORDER_TRANSITIONS` 表 + §4 状态机图

**文档原文**（02-模块总览.md）：
```ts
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  0: [1, 4],   // PENDING  → PAID / CANCELLED
  1: [2, 4],   // PAID     → SHIPPED / CANCELLED
  2: [3],      // SHIPPED  → COMPLETED
  3: [],       // COMPLETED → 终态
  4: []        // CANCELLED → 终态
}
```

**代码事实**（`server/src/admin-orders/dto/order.dto.ts:11-30`）：
```ts
export const ORDER_STATUSES = [0, 1, 2, 3, 4, 5] as const
export const ORDER_STATUS_LABELS = {
  0: '待付款', 1: '待发货', 2: '已发货',
  3: '已完成', 4: '已取消', 5: '已退款'
}
export const ORDER_TRANSITIONS = {
  0: [1, 4],
  1: [2, 4],
  2: [3, 5],   // SHIPPED 可走 REFUNDED
  3: [5],      // COMPLETED 可走 REFUNDED
  4: [],
  5: []
}
```

**额外问题**：前端 `admin/src/api/admin-orders.ts:12` 的 `ORDER_STATUSES = [0,1,2,3,4]` 不识别状态 5，详情 `ORDER_STATUS_LABELS[5]` 得到 `undefined`。

**修改建议**：02 / 03 / 06 三处文档同步补 6 个状态；前端 `admin-orders.ts` 加 5；OrderListView 详情增加 `refundedAt` 显示。

---

✅ (已修复) ### H4. ADMIN 权限码清单 3 处文档严重过时（24 vs 41）

**文档位置**：
- `docs/00-总览与入门/04-开发约定与常见问题.md` §4（24 条）
- `docs/10-服务端/04-认证与权限体系.md` §5（23 条）
- `docs/10-服务端/06-数据迁移与Seed脚本.md` §4（17 条）

**代码事实**（`server/prisma/seed.ts:18-52` `ADMIN_PERMISSIONS`）：实际 **41 条**。

**文档列出但 seed 中不存在的权限码**（这些暗示 operator 可用，但 operator 实际没有——属于功能/权限错位）：

| 权限码 | seed | types.ts | controller `@RequirePermission` |
| --- | --- | --- | --- |
| `user:edit` | ✗ | ✓ | 用了（admin-users.update） |
| `category:delete` | ✗ | ✓ | 用了（admin-categories.remove） |
| `order:cancel` | ✗ | ✓ | 用了（admin-orders.updateStatus） |
| `banner:delete` | ✗ | ✓ | 用了（admin-banners.remove） |
| `announcement:publish` | ✗ | ✓ | 用了（admin-announcements.publish/unpublish） |
| `announcement:delete` | ✗ | ✓ | 用了（admin-announcements.remove） |
| `product:delete` | ✗ | ✓ | 用了（admin-products.remove） |

→ 这些 controller 装饰器都用 `xxx:delete` 权限，但 seed 没分配给 ADMIN，operator 操作时会被 `PermissionsGuard` 拦截。

**seed 中存在但所有文档未列出的权限码**（24 条）：
- 优惠券：`coupon:list` / `coupon:create` / `coupon:edit` / `coupon:on_off` / `coupon:delete` / `coupon:grant`
- 退款：`refund:list` / `refund:detail` / `refund:approve` / `refund:reject` / `refund:refund`
- 库存：`inventory:list` / `inventory:warning`
- 导出：`export:orders` / `export:products` / `export:inventory_logs`
- 审计：`audit:view`
- 评价：`review:list` / `review:detail` / `review:approve` / `review:block` / `review:reply`
- 设置：`setting:list` / `setting:site:edit` / `setting:customer_service:edit`

**修改建议**：
1. 把 `seed.ts` 中 `ADMIN_PERMISSIONS` 数组作为唯一真相源，更新 3 个文档的权限码清单。
2. 同步更新 `04-认证与权限体系.md` §5 注释「ADMIN 角色：上述列表（不含删除 / 角色分配等敏感操作）」——实际是 41 条。
3. 06 §4「故意不包含」清单需要更新：把 `coupon:delete` / `refund:approve` 等敏感操作**已经被加入了** ADMIN 角色权限这件事写明。

---

✅ (已修复) ### H5. 系统设置四方权限码不一致（真 bug）

**文档位置**：
- `docs/20-管理后台/14-系统设置.md` 全文统一用 `setting:edit`
- `admin/src/router/index.ts:59` `meta.permission: 'setting:edit'`
- `admin/src/layouts/AdminLayout.vue:71` `permission: 'setting:edit'`
- `server/src/admin-settings/admin-settings.controller.ts:17` GET 用 `@RequirePermission('setting:list')`
- `server/src/admin-settings/admin-settings.controller.ts:27-33` PUT 用 5 个 `setting:*:edit`

**代码事实**：`setting:edit` 权限码根本不存在于 `types.ts` 也不在 `ADMIN_PERMISSIONS` 中（后者只有 `setting:list` + `setting:site:edit` + `setting:customer_service:edit`）。

**影响**：
1. ADMIN 用户在菜单看不到「系统设置」。
2. 直接输 URL 会被路由守卫挡（`return { name: 'dashboard' }`）。
3. 即使绕过路由层进入 Settings 页，ADMIN 保存「支付方式 / 起送金额」或「免运费门槛 / 默认运费」时 `AdminSettingsService.bulkUpsert` 第 95-114 行的 per-group 二次校验会抛 `ForbiddenException`。

**修改建议**：
- 最小修复：把 `router/index.ts` + `AdminLayout.vue` 的 `setting:edit` 改为 `setting:list`，与 controller GET 一致；同步改 `docs/20-管理后台/14-系统设置.md`。
- 业务决策：是否给 ADMIN 加 `setting:payment:edit` / `setting:shipping:edit`（让 ADMIN 能编辑全部 tab）；或在文档中明确"ADMIN 仅能编辑 site + customer_service 两个 tab"。

---

✅ (已修复) ### H6. 全局 `AuditInterceptor` 已实现但文档说"暂未实现"

**文档位置**：`docs/10-服务端/05-通用服务与中间件.md` §8「全局守卫 / 拦截器现状」

**文档原文**：
> | `PermissionsGuard`（后台） | 在 `AdminAuthModule` 注册，**当前生效方式需确认** |
> | 全局拦截器（如日志） | **暂未实现**；Phase 2 操作日志（`AuditLog`）会引入全局拦截器 |

**代码事实**：
- `server/src/audit/audit.module.ts:4-14` 通过 `{ provide: APP_INTERCEPTOR, useClass: AuditInterceptor }` 全局注册 `AuditInterceptor`。
- `server/src/audit/audit.interceptor.ts`（170 行）实现 POST/PATCH/PUT/DELETE 自动写 `audit_logs`、敏感字段过滤、URL 解析 resource/action。
- `server/prisma/seed.ts` 写 14 条 demo 审计日志。

**修改建议**：把该行更新为「全局拦截器 `AuditInterceptor`：已在 `AuditModule` 通过 `APP_INTERCEPTOR` 注册，覆盖所有 `POST/PATCH/PUT/DELETE`，自动写 `audit_logs`（含敏感字段脱敏）」。

---

✅ (已修复) ### H7. 前台守卫覆盖清单漏 2 个 controller

**文档位置**：`docs/10-服务端/02-模块总览.md` 末段 / `docs/10-服务端/04-认证与权限体系.md` §8

**文档原文**：
> 前台接口是否要登录由各控制器自己用 `@UseGuards(JwtAuthGuard)` 决定（**目前只有 `ClientOrdersController` 加了**）。

**代码事实**：
- `server/src/coupons/coupons.controller.ts:17` `@UseGuards(JwtAuthGuard)` ← 文档未列
- `server/src/refunds/refunds.controller.ts:14` `@UseGuards(JwtAuthGuard)` ← 文档未列

**修改建议**：02 §末尾、04 §8 表格补上 `CouponsController` 与 `RefundsController`。

---

✅ (已修复) ### H8. 移动端页面数 10 vs 13，3 个 Phase 2 页面完全未文档化

**文档位置**：
- `docs/30-移动端/02-路由与页面结构.md:3`「移动端所有页面（10 个）的清单」
- `docs/30-移动端/05-业务模块说明.md:3`「10 个页面按业务模块分组」
- `docs/30-移动端/01-技术栈与启动.md:189`「`views/` 10 个页面组件」

**代码事实**：`client/src/views/` 实际 13 个 `.vue`：
- 已有文档：LoginView / HomeView / CategoryView / CartView / ProfileView / ProductDetailView / OrderConfirmView / OrderSuccessView / OrderListView / OrderDetailView
- 缺失文档：
  - `CouponCenterView.vue`（领券中心 + 我的优惠券，2 个 Tab + 领取逻辑）
  - `RefundListView.vue`（我的退款）
  - `RefundDetailView.vue`（退款详情 + 状态提示）

**修改建议**：将"10 个页面"改为 13；02 路由总览表补 3 行；05 补两节"领券中心"和"退款"。

---

✅ (已修复) ### H9. 路由 `/coupons`、`/refunds/my`、`/refunds/detail` 在路由表中存在但文档零提及

**文档位置**：`docs/30-移动端/02-路由与页面结构.md` 路由总览表（只到 `/order/detail`）

**代码事实**：`client/src/router/index.ts:82-100` 注册了 3 条 `requiresAuth` 路由：
- `/coupons` → CouponCenterView
- `/refunds/my` → RefundListView
- `/refunds/detail` → RefundDetailView

**修改建议**：02 §1 表格补 3 行；§5 流程图补 P→CO（领券中心）、P→RL（我的退款）、OD→RD（退款详情）几条边。

---

✅ (已修复) ### H10. AGENTS.md §7 #8 警告的 mock 注释实际仍在代码

**AGENTS.md 说法**（坑位 #8）：
> `client/src/api/request.ts` 中的「所有接口走本地 mock」注释已过时；当前**所有 api 已切真实调用**。

**代码事实**（`client/src/api/request.ts:3-9`）：
```ts
/**
 * 通用请求实例（ofetch 封装）。
 *
 * 当前阶段所有接口走本地 mock，未真正发起网络请求。
 * 等后端（NestJS）就绪后，只需把 mock 函数替换为真实调用即可：
 */
```

**修改建议**：删除 `client/src/api/request.ts:3-9` 注释块；同时把 `delay()` 的"模拟网络延迟，方便观察 loading 态"注释改为真实意图或删除。

---

✅ (已修复) ### H11. AGENTS.md §7 #9 警告的"演示版"文案实际仍在登录页

**AGENTS.md 说法**（坑位 #9）：
> 「演示版：任意非空用户名 / 密码均可登录」已过时，会走真实 bcrypt 校验。

**代码事实**（`client/src/views/LoginView.vue:64`）：
```vue
<div class="hint">演示版：任意非空用户名 / 密码均可登录</div>
```

**修改建议**：删除 `.hint` 整段 + 对应 `<style>` 中的 `.hint` 规则；或改为"测试账号 alice~eve / user123"。

---

✅ (已修复) ### H12. 文档全写"Vant 5"，实际装 Vant 4.10.2

**文档位置**：
- `AGENTS.md:11`「Vue 3.5 + Vant 5」
- `docs/30-移动端/README.md:3, 9`「Vant 5 / Vant5」
- `docs/30-移动端/01-技术栈与启动.md:14`「UI 库 | Vant 5」

**代码事实**：
- `client/package.json:14` `"vant": "^4.10.2"`
- `@vant/auto-import-resolver`: `^1.2.1`（v4 / v5 API 不一致）

**修改建议**：把所有"Vant 5 / Vant5"改为"Vant 4"（README.md、01-技术栈与启动.md、AGENTS.md）。或反过来，把 `package.json` 升到 Vant 5 并测试通过再保留"5"。

---

✅ (已修复) ### H13. 文档称优惠券 / 退款为"Phase 2 占位"，代码已完整实现

**文档位置**（4 处）：
- `docs/30-移动端/02-路由与页面结构.md:78`「菜单列表：我的订单 / **优惠券（Phase 2）** / 收货地址（Phase 2） / 客户服务」
- `docs/30-移动端/05-业务模块说明.md:205-206`「优惠券（Phase 2 占位）」、「收货地址（Phase 2 占位）」
- `docs/30-移动端/05-业务模块说明.md:214`「优惠券 / 收货地址」菜单文案带「Phase 2 待开发」提示
- `docs/30-移动端/04-核心业务流程.md:210`「退款（Phase 2）：是否恢复销量 / 库存待定」

**代码事实**：
- `client/src/views/ProfileView.vue:34-39` 菜单：我的订单 / **我的退款**（→ `/refunds/my`）/ **优惠券**（`listMyCoupons` 实时拿张数 → `/coupons`）/ 收货地址（仍 Phase 2）/ 客户服务
- `client/src/views/OrderConfirmView.vue:24-26` 完整优惠券选择（`loadAvailableCoupons` + `previewCoupon`）+ 折扣金额 + `createOrder({ couponId })`
- `client/src/views/OrderDetailView.vue:90-99`「申请退款」按钮 + Dialog（status ∈ {2, 3} 且无已有退款时）+ `createRefund`

**修改建议**：
- 02 §3 ProfileView 菜单补"我的退款"行 + 改优惠券 Phase 2 标注（收货地址仍 Phase 2，保留）
- 05 §10 ProfileView 同步
- 05 §9 OrderDetailView 操作补"申请退款"分支
- 04 §2 下单流程图补 coupon 节点；§8 删"待定"
- 04 加"申请退款流程"（状态 2/3 触发）+ "退款状态机分支"

---

✅ (已修复) ### H14. `/order/success` query 参数文档写 `orderNo`，实际是 `id`

**文档位置**（3 处）：
- `docs/30-移动端/02-路由与页面结构.md:170` 表格「/order/success | orderNo」
- `docs/30-移动端/05-业务模块说明.md:127`「跳 `/order/success?orderNo=...`」
- `docs/30-移动端/05-业务模块说明.md:133`「从 `route.query.orderNo` 读订单号展示」

**代码事实**：
- `client/src/views/OrderConfirmView.vue:153` `router.replace({ name: 'order-success', query: { id: order.id } })`
- `client/src/views/OrderSuccessView.vue:5` `const orderId = Number(route.query.id)`

**修改建议**：把所有 `orderNo` 改为 `id`；OrderSuccessView 显示的是订单 ID（`#${orderId}` 或跳详情），措辞同步。

---

✅ (已修复) ### H15. README 把 08–14 全部标 Phase 2 占位，但均已实现

**文档位置**：`docs/20-管理后台/README.md:26-34`「Phase 2 占位」表格

**文档原文**：08 优惠券 / 09 库存 / 10 评价 / 11 退款 / 12 数据导出 / 13 操作日志 / 14 系统设置 全部标 `[Phase 2 预留]`。

**代码事实**：
- `admin/src/views/` 共 18 个 `*View.vue`，08-14 对应全部齐全：CouponListView / CouponClaimsView / InventoryWarningListView / InventoryLogListView / ReviewListView / ReviewDetailView / RefundListView / RefundDetailView / AuditLogListView / SettingsView
- `admin/src/router/index.ts` 实际注册了所有路由
- `admin/src/api/` 实际有 `admin-coupons.ts` / `admin-inventory.ts` / `admin-reviews.ts` / `admin-refunds.ts` / `admin-audit-logs.ts` / `admin-settings.ts` / `admin-exports.ts`

**修改建议**：把 08-14 从「Phase 2 占位」表格移入 Phase 1 完成清单，或新增「Phase 2 已补」清单。

---

✅ (已修复) ### H16. `PermissionsGuard` 注册方式描述错误

**文档位置**：`docs/10-服务端/02-模块总览.md` 第 87 行

**文档原文**：
> `guards/permissions.guard.ts`：`PermissionsGuard`，**全局生效**（NestJS 在子模块里 `useGlobalGuards`）

**代码事实**（`server/src/admin-auth/admin-auth.module.ts:27`）：
```ts
providers: [AdminAuthService, PermissionsGuard,
  { provide: APP_GUARD, useClass: PermissionsGuard }]
```

即通过 `APP_GUARD` provider 全局注册，**没有**调用 `app.useGlobalGuards`。这正是 AGENTS.md §7 坑位 #5 明确点出的事实，文档却写错了。

**修改建议**：把括号内说明改为"全局生效（`AdminAuthModule` 通过 `APP_GUARD` provider 注册；不要重复 `app.useGlobalGuards`）"。04 §7 已经写对了，可参考。

---

✅ (已修复) ### H17. Seed 入口命令文档写 `ts-node`，实际 `tsx`

**文档位置**：
- `docs/10-服务端/01-技术栈与启动.md:126`
- `docs/10-服务端/06-数据迁移与Seed脚本.md:26`

**文档原文**：`"seed": "ts-node prisma/seed.ts"`

**代码事实**（`server/package.json:28`）：
```json
"prisma": { "seed": "tsx prisma/seed.ts" }
```

`tsx` 是 `server/package.json` 的 devDependencies 第 38 行新增；项目里**没有** `ts-node` 依赖。

**修改建议**：两处文档都改为 `tsx`。

---

## 中严重度（Medium）

✅ (已修复) ### M1. Dashboard 文档结构与实际代码严重不符

**文档位置**：`docs/20-管理后台/03-仪表盘.md`

**代码事实**（`admin/src/views/DashboardView.vue`、`server/src/admin-dashboard/admin-dashboard.service.ts`）：

| 项 | 文档 | 实际 |
| --- | --- | --- |
| KPI 卡数量 | 4 个（§5） | **5 个**（新增「库存预警」，点击跳转 `/inventory/warnings`） |
| topProducts 字段 | `{ id, title, cover, sales, stock, price, count }`（§3） | `{ productId, title, cover, sales, gmv }` |
| 热销商品表格列 | ID / 商品 / 价格 / 销量 / 库存（§7） | 排名 / 封面 / 商品名 / 销量 / GMV（无价格/库存列；多 GMV 列） |
| 待处理订单表格列 | 订单号 / 金额 / 用户 / 创建时间（§8） | 订单号 / 用户 / 金额（无创建时间列） |
| 销售趋势切换 | 14 / 30 下拉（§6） | 写死 `getSalesTrend(7)`，无切换控件 |

**修改建议**：重写文档 03 §3 返回结构、§5/§7/§8 UI 描述、§6 描述。

---

✅ (已修复) ### M2. 管理后台视图 / 路由 / 菜单清单严重不全

**文档位置**：
- `docs/20-管理后台/01-技术栈与启动.md` §3 路由结构（列 7 个）、§8 目录 `views/`（列 8 个）、§8 `api/`（列 8 个）
- `docs/20-管理后台/02-账号权限与登录.md` §9 `menuItems`（列 7 个）

**代码事实**：
- `admin/src/router/index.ts` 实际注册 **18 条**路由
- `admin/src/views/` 实际 **18 个** `.vue`
- `admin/src/layouts/AdminLayout.vue:55-67` 实际 **13 个菜单项**（多出 coupons / reviews / audit-logs / settings / inventory/warnings / refunds）
- `admin/src/api/` 实际 **17 个**文件（含 7 个 Phase 2 文件）

**修改建议**：01 §3 / §8、02 §9 同步到完整清单。

---

✅ (已修复) ### M3. BannerListView 启用控件描述与代码不符

**文档位置**：`docs/20-管理后台/07-内容管理.md` §4 轮播图布局

**文档原文**：表格列「启用（el-switch）」

**代码事实**（`admin/src/views/BannerListView.vue`）：
- 表格中「启用」列用 `el-tag` 显示文本（line 112-117）
- `el-switch` 仅出现在编辑 Dialog 表单（line 175）

**修改建议**：文档第 4 节改为"启用（el-tag）/ 编辑 Dialog 中 el-switch 切换"。

---

✅ (已修复) ### M4. 订单 / 商品 / 库存流水导出功能在主文档完全未提及

**文档位置**：`docs/20-管理后台/06-订单管理.md` / `05-商品与分类管理.md` / `09-库存预警.md`

**代码事实**：
- `OrderListView.vue:218` 顶部「导出 Excel」按钮 + Dialog（line 447-484），`v-permission="'export:orders'"`
- `ProductListView.vue:257-258` 同样实现
- `InventoryLogListView.vue:142-143` 同样实现

**修改建议**：在文档 06 / 05 / 09 列表页一节补充「导出 Excel」入口 + 链接到 12-数据导出.md。

---

✅ (已修复) ### M5. 订单搜索 placeholder 与代码行为不一致

**位置**：`admin/src/views/OrderListView.vue:207`、`:456` 导出 Dialog

**实际行为**（`server/src/admin-orders/admin-orders.service.ts:21-27`）：
- 全数字 → 按 `Order.id` 精确匹配
- 否则 → 按 `user.username` 模糊（`contains, mode: 'insensitive'`）

**问题**：placeholder 写"订单号 / 用户名"误导——订单号必须为纯数字（实际按 ID）。

**修改建议**：把 OrderListView placeholder 改为"订单 ID（纯数字）/ 用户名"。

---

✅ (已修复) ### M6. 仪表盘 KPI 卡片可点击交互未文档化

**代码事实**：`DashboardView.vue:147-148, 178-185`「待处理订单」与「库存预警」两个 KPI 卡均有 `@click` 跳转；line 226-227、251-252 顶部还有 el-link「查看全部 →」。

**修改建议**：03 §5 KPI 卡描述补充点击交互。

---

✅ (已修复) ### M7. `CreateOrderPayload` 类型定义漏 `couponId`

**文档位置**：`docs/30-移动端/03-状态管理与接口调用.md:193-197`

**文档原文**：
```ts
export interface CreateOrderPayload {
  items: CartItemPayload[]
  receiver: ReceiverPayload
  remark?: string
}
```

**代码事实**（`client/src/api/order.ts:17-26`）：实际多 `couponId?: number`（注释"使用 `UserCoupon.id`，不是 `coupons.id`"）。

**修改建议**：类型定义补 `couponId?: number`；`OrderListItem` 补 `originalAmount` / `discountAmount`；`OrderDetail` 补 `coupon: OrderCouponInfo | null` 和 `refund: OrderRefundBrief | null`。

---

✅ (已修复) ### M8. OrderDetailView「申请退款」功能完全未文档化

**文档位置**：`docs/30-移动端/05-业务模块说明.md:181-188` 操作分支只写 PENDING 取消 / PAID 取消+提醒发货 / SHIPPED 确认收货。

**代码事实**（`client/src/views/OrderDetailView.vue:96-103, 226-243`）：
- `canRefund` = status ∈ {2, 3} 且无已有退款时显示按钮
- 点按钮弹 Dialog 输入金额 + 原因 → 调 `createRefund` → 跳 `refund-detail`

**修改建议**：05 §9 补申请退款分支；04 §3 后加 §5 退款申请流程时序图。

---

✅ (已修复) ### M9. 下单流程图未含优惠券节点

**文档位置**：`docs/30-移动端/04-核心业务流程.md:70-104` 时序图直接从"提交订单 → POST /api/orders"。

**代码事实**（`OrderConfirmView.vue`）：
- `onMounted` 调 `loadAvailableCoupons`（`/api/coupons/mine?status=0`）
- 用户选券后调 `previewCoupon`（`/api/coupons/preview`）拿折扣
- `createOrder` payload 携带 `couponId`

**修改建议**：时序图在 `OC->>API: POST /api/orders` 之前补 coupon 加载 / 选中 / 预览三条交互。

---

✅ (已修复) ### M10. 部署文档环境变量清单不全

**文档位置**：`docs/40-部署与运维/01-环境准备.md:44-58`

**文档原文**：列 5 个 env：`DATABASE_URL / PORT / JWT_SECRET / JWT_ADMIN_SECRET / NODE_ENV`

**代码事实**（`server/.env.example`）：实际 8 个：
```
DATABASE_URL
JWT_SECRET
JWT_EXPIRES_IN="7d"          ← 缺
JWT_ADMIN_SECRET
JWT_ADMIN_EXPIRES_IN="7d"    ← 缺
PORT=3000
NODE_ENV=development
CORS_ORIGINS="http://localhost:5173,http://localhost:5174"   ← 缺
```

`server/src/main.ts:11-15` 实际读取 `CORS_ORIGINS`（用于 cors origin 白名单）。

**修改建议**：
- 01 §"服务端环境变量"补 `JWT_EXPIRES_IN=7d` / `JWT_ADMIN_EXPIRES_IN=7d` / `CORS_ORIGINS="https://yourdomain.com,https://admin.yourdomain.com,https://m.yourdomain.com"`
- 04-上线检查清单.md 增加「CORS_ORIGINS 已改为线上域名」项

---

✅ (已修复) ### M11. 上线清单的 Prisma 迁移命令实际不存在

**文档位置**：`docs/40-部署与运维/04-上线检查清单.md:17`

**文档原文**：
> 数据库已迁移：`npm run prisma:migrate deploy` 成功

**代码事实**：
- 根 `package.json:32` `"prisma:migrate": "npm run prisma:migrate -w server"` → 实际跑 `prisma migrate dev`（dev 命令）
- 根 `package.json` **没有** `prisma:deploy` script
- `server/package.json:18` `"prisma:deploy": "prisma migrate deploy"` 只在 server workspace 内可用
- `npm run prisma:migrate deploy` 这种写法会把 `deploy` 当参数传给 `prisma migrate dev`，会报错

**修改建议**：
- 04-上线检查清单.md 改为 `npm run prisma:deploy -w server`（并补"首次部署后用 `npm run prisma:seed` 写入初始账号"）
- 02-部署步骤.md:29 把"应用所有 migration"改成 `npm run prisma:deploy -w server`（当前写的 `npm run prisma:migrate` 在生产用是错的，会触发 dev 的 interactive prompt）

---

✅ (已修复) ### M12. 退款 UI 状态已实现，文档仍标「Phase 2 UI」

**文档位置**：`docs/10-服务端/03-数据库Schema说明.md` §3「refund_requests」字段说明

**文档原文**：`status` 字段说明末尾标「（Phase 2 UI）」

**代码事实**：
- `server/src/admin-refunds/admin-refunds.controller.ts`：已实现 GET / PATCH approve / PATCH reject / PATCH refund / GET :id 共 5 个接口，全部带权限码
- `server/src/refunds/refunds.controller.ts`：前台已实现 POST / GET my / GET :id
- `server/src/refunds/dto/refund.dto.ts` 状态机 `REFUND_TRANSITIONS` 已实现
- `server/prisma/seed.ts` 还会写 demo 退款申请数据

**修改建议**：去掉"（Phase 2 UI）"标记；并考虑补充退款状态机的图（与 orders 状态机并列）。

---

✅ (已修复) ### M13. ADMIN 角色"故意不包含"清单需要重写

**文档位置**：`docs/10-服务端/06-数据迁移与Seed脚本.md` §4 末尾

**文档原文**：
> 故意**不包含**：`user:edit`、`category:delete`、`product:delete`、`banner:delete`、`announcement:publish`、`announcement:delete`、`order:cancel`。这些敏感操作仅 `SUPER_ADMIN` 可做。

**代码事实**：
- 上述 7 个权限码在 seed 中**确实**没有分配给 ADMIN——这一行事实成立。
- 但 ADMIN 实际**持有**的 Phase 2 敏感操作（文档未提）：`coupon:delete`、`coupon:grant`、`refund:approve`、`refund:reject`、`refund:refund` 都已经在 `ADMIN_PERMISSIONS` 数组里。
- 文档又说"`product:delete` 故意不含"——但 `product:delete` 在 seed 中也**没有**，只在 types.ts 声明 + controller 用 `@RequirePermission('product:delete')`（同样属 H4 提到的"声明但未授权"问题）。

**修改建议**：
1. 明确划分：seed 没分配的 7 个 = 仅 SUPER_ADMIN 可做。
2. 同时把 ADMIN 现在持有但文档未列的敏感操作（`coupon:delete`、`refund:approve` 等）写明。

---

✅ (已修复) ### M14. Phase 2 迁移历史完全缺失

**文档位置**：`docs/10-服务端/06-数据迁移与Seed脚本.md` §2「迁移历史」

**文档原文**（只列 2 个迁移）：
```
| init | 20260911055156 | 初始：users / categories / products / banners |
| phase1_admin_and_orders | 20260911063637 | Phase 1 增量 |
```

**代码事实**：实际还有 7 个 Phase 2 迁移：
- `20260911120815_phase2_coupons`：orders 加 `original_amount` / `discount_amount`；新增 coupons / user_coupons
- `20260911125900_phase2_reviews`：新增 reviews
- `20260911132309_phase2_inventory`：products 加 `threshold`；新增 inventory_logs
- `20260911134947_phase2_audit_logs`：新增 audit_logs
- `20260911143048_phase2_settings`：新增 settings
- `20260912000000_phase2_add_refunded_at`：orders 加 `refunded_at`
- `20260912000001_phase2_add_review_order_id`：reviews 加 `order_id`

**修改建议**：补全迁移表，并标注"Phase 1 + Phase 2 增量"两列。

---

## 低严重度（Low）

✅ (已修复) ### L1. Seed 写入步骤遗漏 3 步

**文档位置**：`docs/10-服务端/06-数据迁移与Seed脚本.md` §3（列 8 步）

**代码事实**（`server/prisma/seed.ts`）：实际还有：
- **写入评价**（`Seeding reviews...`，11 条 demo，status 含 0/1/2）
- **写入审计日志**（`Seeding audit logs...`，14 条 demo）
- **写入 / 更新设置**（`Seeding settings...`，12 条，groups：site / customer_service / payment / shipping）

**修改建议**：补 9–11 步；并把"清理业务表"顺序与代码一致（`deleteMany` 顺序：`refundRequest → orderItem → order → announcement → banner → review → product → category → user → adminUser → role`）。

---

✅ (已修复) ### L2. `User` 模块 service 引用 schema 不存在的字段（真 bug）

**位置**：`server/src/admin-users/admin-users.service.ts:18` `where.status = q.status`

**schema 事实**：`server/prisma/schema.prisma:10-24` `User` 模型**无** `status` 字段。

**影响**：状态筛选实际会抛 Prisma 错误，但 UI 看上去一切正常；`docs/04-用户管理.md` §8 已点出该问题（"`users` 表根本没有 status 字段"），但代码侧未修。

**修改建议**：改 service 把 status 过滤改成内存层 / 注释占位 / 加 schema 字段。

---

✅ (已修复) ### L3. 主题色覆盖描述不准确

**AGENTS.md §7 #7 说法**：
> `admin/src/styles/main.css` 已在 `:root` + `:root[data-theme="dark"]` 完成 Element Plus 变量覆盖，**不要**再说"未做"。

**代码事实**（`admin/src/styles/main.css:62` 注释）：
> Element Plus 暗色覆盖已经由 `.dark` 提供；这里保持品牌主色一致。

实际：`--el-color-primary` 在 `:root` 显式声明；`:root[data-theme="dark"]` **只重写 `--app-*`** 变量，Element Plus 暗色覆盖由 Element Plus 自己的 `.dark` 类提供。

**修改建议**：AGENTS.md §7 #7 描述精确化：「`admin/src/styles/main.css` 在 `:root` 显式声明品牌主色（`--el-color-primary` 等），并在 `:root[data-theme="dark"]` 下重写 `--app-*` 自有变量；Element Plus 暗色由其内置 `.dark` 类提供，无需重复声明」。

---

✅ (已修复) ### L4. `Product.threshold` 字段未在 schema 文档提及

**文档位置**：`docs/10-服务端/03-数据库Schema说明.md` §3「products」字段说明

**schema 事实**：`schema.prisma:42` 定义 `threshold Int @default(10)`，由 `20260911132309_phase2_inventory` 迁移引入。

**修改建议**：补 `threshold` 字段说明（"库存预警阈值，默认 10，低于阈值时进入预警列表"）。

---

✅ (已修复) ### L5. `Order` 表缺 3 个 Phase 2 字段说明

**文档位置**：`docs/10-服务端/03-数据库Schema说明.md` §3「orders」字段说明

**schema 事实**：缺 `refunded_at` / `original_amount` / `discount_amount` 字段说明。

**修改建议**：补 3 个字段；同步 `refund_requests.status` 流转说明（详见 H3）。

---

✅ (已修复) ### L6. `setQuantity` 上限 99 未文档化

**文档位置**：`docs/30-移动端/03-状态管理与接口调用.md:150-153`

**代码事实**（`client/src/stores/cart.ts:78`）：`it.quantity = Math.max(1, Math.min(99, quantity))`（多了 99 上限）。

**修改建议**：文档同步 `Math.max(1, Math.min(99, quantity))`。

---

✅ (已修复) ### L7. mock 目录描述微误

**文档位置**：`docs/30-移动端/03-状态管理与接口调用.md:235`

**文档原文**：「没有 mock 文件（`client/src` 下不存在 `mock/` 目录）」。

**代码事实**：`client/src/mock/` 目录**存在**但为空（无文件）。

**修改建议**：改为"`client/src/mock/` 目录存在但为空，无实际 mock 文件"或"已彻底清理"。

---

✅ (已修复) ### L8. HomeView 客服电话 + 站点名（公开设置）功能未文档化

**代码事实**（`client/src/views/HomeView.vue:13-32`）：调 `listPublicSettings(['site_name', 'customer_service_phone'])`，影响 nav-bar title + 底部客服电话卡片。

**修改建议**：
- `docs/30-移动端/01-技术栈与启动.md` §8 目录结构补 `api/settings.ts`
- `docs/30-移动端/03-状态管理与接口调用.md` §5 API 清单补 `settings.ts`
- `docs/30-移动端/05-业务模块说明.md` §2 首页补"站点名 + 客服电话"

---

✅ (已修复) ### L9. `refund_requests.status` 状态机未文档化

**文档位置**：`docs/10-服务端/03-数据库Schema说明.md` §3「refund_requests」字段说明

**schema 事实**（`server/src/admin-refunds/dto/refund.dto.ts`）：
```ts
export const REFUND_STATUS_LABELS: Record<RefundStatus, string> = {
  0: '待审', 1: '已批准', 2: '已拒绝', 3: '已退款'
}
export const REFUND_TRANSITIONS: Record<RefundStatus, RefundStatus[]> = {
  0: [1, 2], // PENDING  → APPROVED / REJECTED
  1: [3],    // APPROVED → REFUNDED
  2: [],     // REJECTED (终态)
  3: []      // REFUNDED (终态)
}
```

**修改建议**：补一段退款状态机说明，与订单状态机的描述风格保持一致。

---

✅ (已修复) ### L10. ProfileView 菜单漏「我的退款」项

**文档位置**：
- `docs/30-移动端/02-路由与页面结构.md:78`
- `docs/30-移动端/05-业务模块说明.md:203-205`

**代码事实**（`ProfileView.vue:34-39`）：实际菜单 = 我的订单 / **我的退款** / 优惠券（含实时张数） / 收货地址（Phase 2 待开发，保留） / 客户服务。

**修改建议**：同步修改（与 H13 部分重叠）。

---

✅ (已修复) ### L11. Phase 1 / 2 完成态描述不一致

**文档位置**：
- `AGENTS.md` 项目背景
- `docs/00-总览与入门/01-项目总览.md`

**文档原文**：「当前进度：**完成 Phase 1 主体**（详见 `summary/admin-roadmap.md`），**Phase 2 已预留文档章节编号**」

**代码事实**：`summary/admin-roadmap.md` 末尾写明：
> 最后更新：Phase 1 + Phase 2 **全部完成**。

**修改建议**：把"完成 Phase 1 主体"改为"Phase 1 + Phase 2 已完成"；AGENTS.md 项目背景处同步修正。

---

## 强烈推荐先修（10 条）

按"修一处就能解锁多个文档可信度"原则排序：

| # | 关联条目 | 改动摘要 |
| --- | --- | --- |
| 1 | **H5** 系统设置四方权限码 | `admin/src/router/index.ts` + `admin/src/layouts/AdminLayout.vue` 把 `setting:edit` 改为 `setting:list`；决定 ADMIN 是否补 `setting:payment:edit` / `setting:shipping:edit` |
| 2 | **H10 / H11** AGENTS.md 自点名坑位未清 | 删 `client/src/api/request.ts` mock 注释；删 `LoginView.vue` "演示版" 文案；改 AGENTS.md §7 #8 / #9 措辞 |
| 3 | **H1 / H2 / H8 / H15** Phase 2 完成态同步 | 把 00-总览与入门 / 02-模块总览 / 03-Schema / 20-管理后台 README / 30-移动端 02/05 的模块 / 表 / 页面清单补到 16 张表 / 25 个模块 / 18 视图 / 13 页面；迁移 README 占位表格 |
| 4 | **H3 / L5 / L9** 订单状态 5 + 字段 + 退款状态机 | 补 02-模块总览 / 03-Schema / 06-订单管理；前端 `admin-orders.ts` `ORDER_STATUSES` 加 5；OrderListView 详情增加 `refundedAt` |
| 5 | **H4** ADMIN 权限码清单 | 把 `seed.ts` 数组作单一真相源，更新 3 处文档；明确指出 ADMIN 没有的 7 个权限码 |
| 6 | **H12** Vant 版本号 | 文档统一改为 Vant 4（`client/package.json` 实际 4.10.2） |
| 7 | **H14** `/order/success?orderNo` → `?id` | 改 3 处文档 |
| 8 | **M10 / M11** 部署 env 与 Prisma 命令 | 01-环境准备补 3 个 env；04-上线检查清单把命令改成 `npm run prisma:deploy -w server` |
| 9 | **H6 / M14 / M12 / L1** Phase 2 中间件 + 迁移 + seed 步骤 | 改 05-通用服务与中间件 §8、06-数据迁移与Seed脚本 §2/§3/§4 |
| 10 | **L2** 真 bug（admin-users service 引用 `User.status`） | schema 加字段或 service 改写 |

---

## 复盘要点

| 维度 | 文档当前状态 | 代码实际状态 | 不一致程度 |
| --- | --- | --- | --- |
| 服务端模块数量 | 14–15 个 | 25 个业务模块 | **严重** |
| 数据表数量 | 10 张 | 16 张 | **严重** |
| 订单状态枚举 | 5 个状态 | 6 个状态（含 REFUNDED） | **严重** |
| ADMIN 权限码清单 | 17–24 条 | 41 条 | **严重** |
| 前台守卫覆盖 | 列 4 个 controller | 实际 6 个 | **严重** |
| 全局拦截器 | "暂未实现" | 已实现 `AuditInterceptor` | **严重** |
| 管理后台视图数 | 8 个 | 18 个 | **严重** |
| 移动端页面数 | 10 个 | 13 个 | **严重** |
| `PermissionsGuard` 注册方式 | `useGlobalGuards` | `APP_GUARD` provider | 中 |
| Seed 入口命令 | `ts-node` | `tsx` | 中 |
| 迁移历史 | 2 条 | 9 条 | 中 |
| Seed 写入步骤 | 8 步 | 11+ 步 | 中 |
| Phase 1/2 完成态 | "Phase 1 主体完成" | "Phase 1 + 2 全部完成" | 低 |
| Vant 版本 | "Vant 5" | Vant 4.10.2 | 高 |
| `/order/success` query | `orderNo` | `id` | 高 |
| 系统设置权限码 | `setting:edit`（不存在） | `setting:list` + `setting:*:edit` | **严重** |
| 部署 env 数 | 5 个 | 8 个 | 中 |
| AGENTS.md §7 #8 / #9 | "已过时" | 代码未修复 | 高 |

**核心结论**：`docs/00-总览与入门/`、`docs/10-服务端/`、`docs/20-管理后台/`、`docs/30-移动端/` 整体停留在 Phase 1 完成态，未对 Phase 2 的 7 个模块（2.1 优惠券 / 2.2 评价 / 2.3 库存 / 2.4 退款 UI / 2.5 数据导出 / 2.6 操作日志 / 2.7 系统设置）做文档同步；AGENTS.md §7 自己点名却未真正清理；新成员按文档进入后无法理解完整系统，部分文档与代码行为严重背离会误导使用。

---

## 复核记录（关键事实交叉验证）

| 项 | 期望 | 实测 | 结果 |
| --- | --- | --- | --- |
| `client/package.json` Vant 版本 | ^4.10.2 | `"vant": "^4.10.2"` | ✓ |
| `client/src/api/request.ts` mock 注释 | 仍在 | 第 3-9 行仍写"当前阶段所有接口走本地 mock" | ✓ 证实 H10 |
| `client/src/views/LoginView.vue` "演示版" 文案 | 仍在 | 第 64 行仍输出该 hint | ✓ 证实 H11 |
| `server/src/app.module.ts` 模块数 | 25 个业务模块 | `imports` 数组含 27 项（ConfigModule + PrismaModule + 25 业务） | ✓ 证实 H1 |
| `server/prisma/schema.prisma` model 数 | 16 | 16 个 model 定义 | ✓ 证实 H2 |
| `server/prisma/migrations/` 文件夹 | 9 | 9 个 | ✓ 证实 H2 / M14 |
| `server/src/admin-orders/dto/order.dto.ts` `ORDER_STATUSES` | 含 5 | `[0, 1, 2, 3, 4, 5]` | ✓ 证实 H3 |
| `server/src/admin-orders/dto/order.dto.ts` `ORDER_TRANSITIONS[2]` | 含 5 | `[3, 5]` | ✓ 证实 H3 |
| `server/prisma/seed.ts` `ADMIN_PERMISSIONS` 长度 | 41 | 41 项 | ✓ 证实 H4 |
| `admin/src/router/index.ts` settings meta | `setting:edit` | `'setting:edit'` | ✓ 证实 H5 |
| `admin/src/layouts/AdminLayout.vue` settings 菜单 | `setting:edit` | `permission: 'setting:edit'` | ✓ 证实 H5 |
| `server/src/admin-settings/admin-settings.controller.ts` GET 权限 | `setting:list` | `@RequirePermission('setting:list')` | ✓ 证实 H5 |
| `admin/src/views/` 文件数 | 18 | 18 个 `.vue` | ✓ 证实 M2 / H15 |
| `admin/src/layouts/AdminLayout.vue` 菜单数 | 13 | 13 个 menuItems | ✓ 证实 M2 |
| `client/src/views/` 文件数 | 13 | 13 个 `.vue` | ✓ 证实 H8 |
| `client/src/router/index.ts` Phase 2 路由 | 含 `/coupons` `/refunds/my` `/refunds/detail` | 三条均注册 | ✓ 证实 H9 |
| `OrderConfirmView.vue` 跳转 success 参数 | `id` | `query: { id: order.id }` | ✓ 证实 H14 |
| `server/src/admin-exports/admin-exports.module.ts` | 存在但未挂载 | 文件存在；`app.module.ts` `imports` 无 | ✓ 额外发现 |
| `server/package.json` seed 命令 | `tsx prisma/seed.ts` | `tsx prisma/seed.ts` | ✓ 证实 H17 |
| `server/.env.example` 行数 | 8 | 8 个 key | ✓ 证实 M10 |
| `server/src/main.ts` `CORS_ORIGINS` 读取 | 是 | line 11-15 `process.env.CORS_ORIGINS ?? 'http://localhost:5173'` | ✓ 证实 M10 |
| `admin/src/api/admin-orders.ts` `ORDER_STATUSES` | 不含 5（潜在 bug） | `[0, 1, 2, 3, 4]` | ✓ 证实 H3 衍生问题 |
| `admin/src/directives/permission.ts` 实现 | 与 doc 02 一致 | `mounted` 时检查、移除 DOM | ✓ 一致 |
| `admin/src/styles/main.css` 主题色 | `:root` + `:root[data-theme="dark"]` | `:root` 显式 `--el-color-primary` 等；`:root[data-theme="dark"]` 仅重写 `--app-*` | ✓ 证实 L3 |
| `server/src/admin-auth/types.ts` `setting:edit` | 不存在 | 只有 `setting:list` + 5 个 `setting:*:edit` | ✓ 证实 H5 |
| `admin/src/api/admin-orders.ts` 状态码定义 | 不含 5 | `[0, 1, 2, 3, 4]` | ✓ 证实 H3 |

---

## 附录 A：未挂载的模块（额外发现）

**`server/src/admin-exports/admin-exports.module.ts` 存在但 `app.module.ts` 未注册**：

```ts
// server/src/admin-exports/admin-exports.module.ts
@Module({
  providers: [AdminExportsService],
  controllers: [AdminExportsController]
})
export class AdminExportsModule {}
```

文件存在，但 `app.module.ts` 的 `imports` 数组里**没有** `AdminExportsModule`。

**实际影响**：3 个导出接口（`GET /api/admin/exports/orders`、`products`、`inventory-logs`）当前 **未挂载到 NestJS 容器**，调用会得 404。但 `admin/src/views/OrderListView.vue` 等 3 个列表页都有「导出 Excel」按钮 + Dialog，前端 UI 在但后端 404。

**严重程度**：高（属于隐藏的真 bug）。

**修改建议**：在 `server/src/app.module.ts` 的 `imports` 数组中加 `AdminExportsModule`，并视情况调 `AdminExportsService` 内部代码（未审查）。

---

## 附录 B：建议的下一步

- [ ] **A**：直接按上述"强烈推荐先修"10 条做最小化修复（先验证几条与代码冲突的再动笔，文档侧一次性同步）
- [ ] **B**：针对每条 High 出具 `summary/docs-vs-code-audit-followup-X.md` 任务卡，分派给不同 subagent
- [ ] **C**：只挑一类先修（如先清"Phase 2 完成态"那一片，或先修"AGENTS.md §7 自点名未清"的 2 条）
- [ ] **D**：把 `AdminExportsModule` 挂载 + 复核 `AdminExportsService` 实现（与 12-数据导出.md 同步验证）
- [x] **E**（已完成）：把 `admin-users.service.ts` `User.status` 引用改成不引用该字段 — 应急方案为 commit `39a7306` 移除过滤；完整闭环为 commit `97495dc` 加回 schema 字段 + 重新启用过滤（commit `4acfe4e` + `937df9d` 同步文档）

---

## 审查元信息

- 审查日期：2026-09-12
- 审查范围：`docs/` 29 篇 + `client/` 13 view / `admin/` 18 view / `server/` 25 模块 / `prisma/` 16 model / `package.json` ×3
- 审查方式：3 个并行 subagent 分别负责服务端 / 后台 / 移动端+部署，关键事实交叉复核
- 总条目：54（High 17 / Medium 14 / Low 11）+ 附录发现 1 条未挂载模块
- 关联文档：`docs/` 全部章节；`summary/admin-roadmap.md`（Phase 2 完成定义）；`AGENTS.md`（含 §7 已知坑位）

