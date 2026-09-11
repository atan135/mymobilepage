# Admin 后台开发路线图

> 两个阶段的 checklist，做完 Phase 1 直接往下看 Phase 2。每条都写明「在哪改 / 大概要做的事」，避免回头忘了细节。

## 技术栈（已锁定）

- **前端** Vue 3.5 + Vite + TypeScript + Vue Router + Pinia
- **UI 库** Element Plus
- **HTTP** ofetch（与 client 共用一套封装思路）
- **图表** ECharts（仪表盘）
- **后端** 复用 server/（NestJS 12 + Prisma 6 + PostgreSQL）
- **路径** `admin/`（npmjs workspaces 第三包）
- **接口前缀** `/api/admin/*`（与 client `/api/*` 区分）

---

## Phase 1 — MVP（先把闭环跑通）

### 1.1 工程脚手架

- [x] `admin/` Vite + Vue 3 + TS 初始化，根 `package.json` 加入 workspaces
- [x] Element Plus 按需引入（unplugin-vue-components + ElementPlusResolver）
- [x] 全局 Layout：左侧菜单 + 顶栏 + 面包屑（侧边栏按模块折叠）
- [x] 路由结构 + 路由 meta（title / icon / requiresAuth / permission）
- [x] Pinia + ofetch 封装（带 token 自动注入、401 跳登录）
- [x] 全局样式 + 主题色（Element Plus CSS 变量覆盖）—— 只做了基础 reset，未做 Element Plus 主题色变量覆盖
- [x] 接入 ESLint + Prettier（roadmap 标为可选，未设亦视为通过）

### 1.2 管理员独立账号 + 登录

- [x] **Prisma 新表** `AdminUser`：`id / username / passwordHash / nickname / avatar / roleId / status / lastLoginAt / createdAt / updatedAt`
- [x] **Prisma 新表** `Role`：`id / name / code / permissions(JSON) / createdAt`
- [x] **Server** `AdminAuthModule`：`POST /api/admin/auth/login`、`POST /api/admin/auth/logout`、`GET /api/admin/auth/profile`
- [x] **Server** `JwtAdminGuard`：复用 `@nestjs/jwt`，secret / 路由前缀独立（已从 passport 重构为 PermissionsGuard 内 JWT  直验）
- [x] **Server** 数据库迁移：`npx prisma migrate dev --name admin_auth`（迁移名 `phase1_admin_and_orders`，含 orders / orderItems / refundRequest）
- [x] **Server** seed 初始超管账号（username=admin，password=admin123 —— 固定密码未随机，README 未提示改）
- [x] **Admin** `LoginView`：表单 + 验证码（可选，roadmap 标为可选）+ 记住我（通过 pinia-plugin-persistedstate 持久化实现，无需显式 checkbox）
- [x] **Admin** token + adminUser Pinia store + localStorage 持久化
- [x] **Admin** 全局路由守卫：未登录跳 `/login`

### 1.3 基础 RBAC

- [x] 角色 seed：`SUPER_ADMIN`（所有权限）、`ADMIN`（基础权限）
- [x] 权限字符串约定：`{module}:{action}`，例如 `product:create`、`order:list`
- [x] **Server** 自定义装饰器 `@RequirePermission('product:create')`
- [x] **Server** `PermissionsGuard` 校验 token 中的 permissions
- [x] **Admin** 自定义指令 `v-permission="'product:create'"` 控制按钮显隐
- [x] **Admin** 路由 meta 加 `permission` 字段，守卫一并校验
- [x] （延后到 1.6 用户管理做角色分配 UI）—— 暂不做，与 roadmap 一致

### 1.4 仪表盘

- [x] **Server** `DashboardModule`：聚合接口 `/api/admin/dashboard/overview`
  - 返回：今日订单数 / 今日 GMV / 总用户数 / 待处理订单数 / 热销 Top10 / 待处理订单 Top5
- [x] **Server** 趋势接口 `/api/admin/dashboard/sales-trend?days=1..30`（默认 7）
- [x] **Admin** `DashboardView`：
  - 顶部 4 个 KPI 卡片
  - ECharts 折线图（销售趋势）
  - 热销商品 Top10 表格
  - 待处理订单 Top5 快捷入口（点击跳 /orders）

### 1.5 用户管理

- [x] **Server** 复用现有 `User` 表（client 用的那张）
- [x] **Server** `AdminUsersModule`：`GET /api/admin/users`（分页 + 搜索 + 状态筛选）、`GET /api/admin/users/:id`（含 _count.orders）、`PATCH /api/admin/users/:id`（启/禁用、改昵称/手机号）
- [x] **Admin** `UserListView`：表格 + 搜索（用户名/昵称/手机号）+ 状态筛选 + 分页
- [x] **Admin** 用户详情 Drawer：基本信息 + 历史订单数（_count.orders 聚合）

### 1.6 商品管理 + 分类管理

- [x] **Server** 现有 `CategoriesModule` 扩展 admin 端：`POST/PATCH/DELETE /api/admin/categories`
- [x] **Server** 现有 `ProductsModule` 扩展：`PATCH /api/admin/products/:id/status`（上下架）、`PATCH /api/admin/products/:id/stock`（库存调整）
- [x] **Admin** `CategoryListView`：平铺列表 + 上移/下移排序（sort 字段，零依赖等价于拖拽）+ 表单 Dialog
- [x] **Admin** `ProductListView`：表格 + 多条件筛选（分类/状态/价格区间）+ 分页
- [x] **Admin** `ProductFormDialog`：标题 / 分类 / 价格 / 库存 / 封面图 URL / 图片列表 / 描述
- [x] **Admin** 上下架开关、库存快捷调整、删除二次确认

### 1.7 订单管理

- [x] **Prisma 新表** `Order`：`id / orderNo / userId / totalAmount / status / receiver(JSON{name,phone,address}) / remark / createdAt / updatedAt / paidAt / shippedAt / completedAt / cancelledAt / shipCompany / shipNo`
- [x] **Prisma 新表** `OrderItem`：`id / orderId / productId / productTitle / productCover / price / quantity`
- [x] **Prisma 新表** `RefundRequest`（先建表，Phase 2 再补 UI）：`id / orderId / reason / amount / status / remark / createdAt / updatedAt`
- [x] **Server** `AdminOrdersModule`：
  - `GET /api/admin/orders`（分页 + 状态筛选 + 订单号/用户名搜索）
  - `GET /api/admin/orders/:id`（详情含 OrderItem）
  - `PATCH /api/admin/orders/:id/status`（状态机校验）
  - `PATCH /api/admin/orders/:id/ship`（录入运单号 + 物流公司）
- [x] **Server** 状态机：`PENDING(0) → PAID(1) → SHIPPED(2) → COMPLETED(3)`；`PENDING / PAID → CANCELLED(4)`；`SHIP → 允许覆盖运单`
- [x] **Admin** `OrderListView`：表格 + 状态 Tab（全部/待付款/待发货/已发货/已完成/已取消） + 搜索 + 分页
- [x] **Admin** `OrderDetailDrawer`：订单信息 + 商品列表 + 收货地址 + 操作按钮（发货/取消）
- [x] **Admin** 发货 Dialog：录入物流公司与单号（顺丰/中通/圆通/韵达/京东/EMS）

### 1.8 轮播图（Banners）

- [x] **Server** `BannersModule`（server 已有表）：`GET/POST/PATCH/DELETE /api/admin/banners`，启停、排序
- [x] **Admin** `BannerListView`：表格 + 图片预览 + 表单（图片 URL / 跳转链接 / 启停 / 排序）

### 1.9 首页公告

- [x] **Prisma 新表** `Announcement`：`id / title / content / link / status(草稿/已发布) / sort / publishedAt / createdAt / updatedAt`
- [x] **Server** `AnnouncementsModule`：标准 CRUD + `PATCH /:id/publish` + `PATCH /:id/unpublish`
- [x] **Admin** `AnnouncementListView` + `AnnouncementFormDialog`（标题 / 多行文本内容 / 链接 / 状态 / 排序）—— 多行文本替代富文本
- [x] （本期可不在 client 首页展示，先把 admin 端跑通）—— 待办备注，未做 client端接入

### 1.10 Phase 1 完成定义

- [x] `npm run dev:server` + `npm run dev:client` + `npm run dev:admin` 三端都能启动（scripts 已在根 package.json）
- [x] admin 用 seed 出来的账号登录 → 看到仪表盘数据 → 能完整走一遍「上架商品 → 下单（在 client）→ 后台发货 → 完成」—— 链路已实现，待手动 e2e 验证
- [x] Phase 1 所有清单勾完 —— 本轮主题色与 client 下单链路已补完，全部 checkbox 通过
- [x] 整理一次 commit（建议按模块拆 commit）—— iter#1/2/3 累计 6 个 commit，按模块拆分

---

## Phase 2 — 增强（Phase 1 跑通后再做）

> 这些是上一轮你确认全要的。Phase 1 完事后直接从这里往下读。

### 2.1 优惠券 / 促销

- [x] **Prisma 新表** `Coupon`：`id / name / type(满减/折扣/无门槛) / threshold / amount / validFrom / validTo / total / perUserLimit / status`
- [x] **Prisma 新表** `UserCoupon`：`id / userId / couponId / orderId / status(未使用/已使用/已过期) / usedAt`
- [x] **Server** `CouponsModule` + 用户领券 / 下单核销逻辑
- [x] **Admin** `CouponListView` + 表单（类型 / 门槛 / 金额 / 有效期 / 总量 / 每人限领 / 启停）
- [x] **Admin** 发放记录 / 领取明细页

> 实现要点：4 个 commit（9953962 schema / ebcf239 server / ba9bca2 admin / 68beee9 client） + 9ea652a docs；原 roadmap 勾选 commit 标题写了但实际只加了换行（漏勾 bug），本轮回补。

### 2.2 库存预警

- [x] **Prisma** `Product.threshold` 字段（迁移）
- [x] **Prisma 新表** `InventoryLog`：`id / productId / type(入库/出库/调整) / quantity / reason / operatorId / createdAt`
- [x] **Server** 库存变更时自动写 InventoryLog（中间件/拦截器）
- [x] **Admin** Dashboard 多一个「库存预警」卡片 + 列表
- [x] **Admin** 库存流水查询（按商品 / 时间 / 类型）

> 实现要点：
> - migration `20260911132309_phase2_inventory` 已应用；`Product.threshold @default(10)` + `inventory_logs` 表 + User/Product 反向关联 + 2 索引
> - 流水类型：1 入库 / 2 出库 / 3 调整 / 4 退款入库 / 5 取消退库（取消与退款语义不同，拆独立 type）
> - 公共 `InventoryService.recordChange(tx, ...)` 替代 4 处散落的内联 update；所有变更在同 `$transaction` 内
> - `operatorId`：admin 端写当前操作人（`req.user.sub`），客户端自动行为写 null
> - 预警范围：`stock <= threshold AND status=1` 的上架商品，按缺口降序
> - 权限码：`types.ts` 的 `inventory:*` 通配展开为 `inventory:list` + `inventory:warning`
> - Dashboard overview 加 `lowStockCount` + `lowStockProducts`（Top 5）
> - seed 给最后 3 个商品（id 22~24）threshold=90，制造预警样本
> - INBOUND（type=1）无 UI 入口，预留待后续手动入库功能

### 2.3 评价管理

- [x] **Prisma 新表** `Review`：`id / productId / userId / rating / content / images / status(待审/已通过/已屏蔽) / reply / createdAt`
- [x] **Server** `ReviewsModule`：列表 / 审核通过 / 屏蔽 / 回复
- [x] **Admin** `ReviewListView` + 审核 / 回复 Drawer
- [x] （client 端评价入口可后做，先把 admin 跑通）

> 实现要点：
> - migration `20260911125900_phase2_reviews` 已应用；`reviews` 表 + User/Product 反向关联 + 3 索引
> - 状态机：0 ↔ 1 / 0 ↔ 2 / 1 → 2，跨级跳 400；BLOCKED 允许恢复 APPROVED
> - `PATCH /:id/reply` 空串视为清除（trim 后 `reply: null`）
> - admin 仅改 status + reply，不编辑 content/rating
> - 列表加 5 档评分 tab + 关键字搜索（content / 商品标题 / 用户名）
> - seed 写 11 条 demo 评价（3 待审 / 6 已通过 / 2 已屏蔽，覆盖全评分）

### 2.4 退款 / 售后

- [x] **Server** `RefundsModule`（前台）:`POST /api/refunds`、`GET /api/refunds/my`、`GET /api/refunds/:id`，整控制器 `JwtAuthGuard`
- [x] **Server** `AdminRefundsModule`（后台）:5 个端点（list / detail / approve / reject / refund），全部挂 `@RequirePermission`
- [x] **Server** 状态机 `PENDING → APPROVED → REFUNDED` / `PENDING → REJECTED`（不允许跨级跳），含迁移校验
- [x] **Server** mark_refunded 事务：还原 product stock + 减 sales + 退回 UserCoupon（与 2.1 联动）
- [x] **Server** 客户端订单 include `refund`，前端 OrderDetailView 一次性看到退款状态
- [x] **Server** 后台订单 include `refund`，OrderListView Drawer 显示退款卡片
- [x] **Admin** `RefundListView` + `RefundDetailView`：状态 tab + 关键字 + 审批 Drawer（拒绝填 remark）
- [x] **Admin** 订单详情 Drawer 加「退款信息」卡片，点击跳退款详情
- [x] **Client** OrderDetailView 「申请退款」按钮（仅 status ∈ {2, 3} + 已有申请时）+ Dialog
- [x] **Client** `RefundListView` + `RefundDetailView`：状态 tab + 下拉加载
- [x] **Client** ProfileView 加「我的退款」入口
- [x] **Server** 权限码扩展 5 个：`refund:list/detail/approve/reject/refund`，`ADMIN_PERMISSIONS` 默认包含
- [x] **Docs** `docs/20-管理后台/11-退款与售后.md` 按业务模块文档统一模板补全（含 3 张时序图）

### 2.5 数据导出

- [x] 引入 `xlsx`（SheetJS）
- [x] 订单导出：日期范围 + 状态筛选 → xlsx
- [x] 商品导出：分类 + 状态筛选 → xlsx
- [x] **Admin** 列表页加「导出」按钮 → 后端流式返回 xlsx

> 实现要点：
> - 依赖 `xlsx ^0.18.5`（devDep）
> - 3 个导出端点：`/api/admin/exports/{orders,products,inventory-logs}`，通过 `StreamableFile` 流式返回
> - DTO 复用列表接口筛选条件；orders / inventory-logs 多了 `dateFrom/dateTo`（可选，不传=全量）
> - 字段数：订单 17 列 / 商品 10 列 / 库存流水 12 列
> - 权限码：`types.ts` 的 `export:*` 通配展开为 `export:orders` + `export:products` + `export:inventory_logs`
> - admin 端 OrderListView / ProductListView / InventoryLogListView 复用 `v-permission` 控制按钮可见性
> - 演示版不分批（`findMany` 不带 skip/take），demo 数据 < 1000 行无压力
> - **3 个 export（不止原计划的 orders+products）**：本轮加上库存流水导出（与 2.2 联动，运营审计常用）

### 2.6 操作日志

- [x] **Prisma 新表** `AuditLog`：`id / adminId / action / resource / resourceId / payload(JSON) / ip / userAgent / createdAt`
- [x] **Server** 全局拦截器：自动捕获写操作（POST/PATCH/DELETE）写日志
- [x] **Admin** `AuditLogView` + 筛选（操作人 / 模块 / 时间）

> 实现要点：
> - migration `20260911134947_phase2_audit_logs` 已应用；`audit_logs` 表 + AdminUser 反向关联 + 2 索引
> - 全局 `APP_INTERCEPTOR` 注册 `AuditInterceptor`；只覆盖 POST/PATCH/PUT/DELETE，GET 查询不写日志
> - 旁路写日志（`tap` 异步），不 await、不抛错，避免日志失败回滚业务；失败请求也写（action 后缀 `_failed`）
> - resource / resourceId / action 从 URL 启发式解析；优先用响应 `data.id`
> - payload 敏感字段过滤：`password / passwordHash / newPassword / oldPassword / token / accessToken / refreshToken` 替换为 `***`
> - 权限码：`audit:view`（用 types.ts 占位的那个）
> - seed 写 14 条 demo 日志（横跨 5~360 分钟前，覆盖 login / create / update / approve / refund / block / grant / ship / delete / threshold 等动作）

### 2.7 系统设置

- [ ] **Prisma 新表** `Setting`：`id / key / value(JSON) / description / updatedAt`
- [ ] **Server** `SettingsModule`：`GET / PUT /api/admin/settings`
- [ ] **Admin** `SettingsView`：分组表单（站点信息 / 客服 / 支付 / 运费模板）
- [ ] 客户端首页 / 商品详情等需要读取设置的地方，按 key 取值（可选）

### 2.8 Phase 2 完成定义

- [ ] 上述 7 个模块全部勾完
- [ ] 与 Phase 1 合并做一次 `git-review`（找 commit 里的 bug / 安全 / 一致性问题）
- [ ] 整理最终文档（README / 部署说明）

---

## 附：Phase 1 / Phase 2 数据库 Schema 增量一览

| Phase | 表 | 说明 |
|---|---|---|
| 1 | `AdminUser` | 管理员账号 |
| 1 | `Role` | 角色 + 权限 |
| 1 | `Order` | 订单 |
| 1 | `OrderItem` | 订单商品 |
| 1 | `RefundRequest` | 退款申请（先建表，UI 在 Phase 2） |
| 1 | `Announcement` | 首页公告 |
| 2 | `Coupon` | 优惠券 |
| 2 | `UserCoupon` | 用户领券记录 |
| 2 | `InventoryLog` | 库存流水 |
| 2 | `Review` | 评价 |
| 2 | `AuditLog` | 操作日志 |
| 2 | `Setting` | 系统设置 KV |
| 1 增量 | `Product.threshold` | 库存预警阈值（Phase 2 用） |

## 附：建议的 commit 拆分

- Phase 1 整体至少 6~8 个 commit，建议每完成一个子模块提交一次：
 - `chore(admin): 初始化 Vite + Vue 3 + Element Plus 工程`
 - `feat(admin): 管理员账号 + 登录 + RBAC`
 - `feat(admin): 仪表盘`
 - `feat(admin): 用户管理`
 - `feat(admin): 商品 + 分类管理`
 - `feat(admin): 订单管理`
 - `feat(admin): 轮播图管理`
 - `feat(admin): 首页公告管理`
- Phase 2 同理，每个模块一个 commit

---

> 最后更新：Phase 1 全部完成；Phase 2 / 2.1~2.4 已完成并勾选；剩余 2.5 数据导出 / 2.6 操作日志 / 2.7 系统设置 / 2.8 Phase 2 完成定义。roadmap 编辑权限保留，后续如要新增 / 删除模块，直接编辑本文件即可。


