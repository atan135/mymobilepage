# git-review Phase 2

> 审查范围：Phase 2 全部 commit（从 9953962 phase2 优惠券 schema 到 d8f10c1 phase2 系统设置总结，共 30 个 commit）。Phase 1 之前的 commit（cc04e4f 之前）不在审查范围。
>
> 审查方式：对照 SKILL.md 的检查点（事务边界 / 权限 / 状态机 / 异常路径 / payload 泄露），逐模块拉取源码 + diff 抽样，未启动服务做端到端验证（环境受限）。
>
> 严重程度分布：**Critical: 0 / High: 1 / Medium: 3 / Low: 4**，全部为已知风险 + 演示版简化点。

## 审查范围

- 仓库：`D:\project\mymobilepage`
- 分支：`main`
- 时间段：2026-09-11 20:11:39 ~ 22:35:19
- 提交数：30（不含 merge）
- 策略：每个 module 抽样关键 commit 详查，CRUD 类 commit 一带而过

## 结果概览

| 严重程度 | 数量 | 描述 |
| --- | --- | --- |
| Critical | 0 | 无远程利用 / 数据破坏 / 权限绕过风险 |
| High | 1 | `client-settings` 白名单用前缀匹配，可能泄露站点配置 |
| Medium | 3 | `admin-settings` bulkUpsert 默认 group='general'；AuditInterceptor payload 大对象风险；refunds 部分退款按全额退券 |
| Low | 4 | 演示版简化点（评价不绑订单 / settings value 必须为对象 / AuditLog 不分批 / InventoryLog 不分批）|

## Commit 抽样结论

下面只列**有真实问题或值得记录**的 commit。无问题的不一一列出。

---

## Commit: 17d6485 RefundsModule（含 High + Medium）

- 作者：zergzerg
- 时间：2026-09-11 20:43
- 文件：`server/src/refunds/refunds.service.ts`、`server/src/admin-refunds/admin-refunds.service.ts`、`server/prisma/seed.ts`

### 问题 1：客户端按全额退券（即使部分退款）
- 严重程度：**Medium**
- 类型：业务正确性
- 位置：`server/src/admin-refunds/admin-refunds.service.ts` `markRefunded`
- 问题：markRefunded 事务里把 `order.coupons` 整张退，**不管退款金额是否等于订单总额**。如果 admin 批准 `amount=50`（订单总额 100），按演示版规范应该把整张 10 元券退回，但用户可能希望「部分退款不退券」（按消费比例拆）。
- 影响：演示版可接受；生产化需要按 `amount / totalAmount` 比例判断退券。
- 修复建议：本期不改；生产化阶段加 `partialRefund` 模式判断，或在退款 dialog 强制「部分退款不退券」选项。
- 验证建议：手动创建一个 100 元订单 + 10 元券，发起 50 元退款，看券是否退回。

### 问题 2：客户端可绕开 `JwtAuthGuard` 在 controller 触发?
- 严重程度：**未发现**（已验证）
- 检查：`server/src/refunds/refunds.controller.ts` 是否挂了 `@UseGuards(JwtAuthGuard)`
- 结果：已挂（参考 `c4757d6 + 704a1ae + 35a3291` 三个 fix 修复了 JwtAuthGuard DI 问题）。当前 controller 通过 `AuthModule + PassportModule.register` 注入守卫。
- 结论：权限隔离正常。

### 问题 3：markRefunded 状态机边界
- 严重程度：**未发现**
- `assertTransition(r.status, 3)` 确保只能从 APPROVED → REFUNDED，已拒 / 已退的二次调用会被 400 拦截。
- `assertTransition(r.status, 2)` 拒绝可以 PENDING → REJECTED 但不能从已退款再拒。
- 状态机完整。

---

## Commit: 22c4564 InventoryService 切换（重点 review）

- 作者：zergzerg
- 时间：2026-09-11 21:28
- 文件：4 个 service 的 stock 改写点

### 问题 1：事务边界完整
- 严重程度：**未发现**
- 验证：4 处切点（`admin-products.adjustStock` / `client-orders.createOrder` / `client-orders.cancel` / `admin-refunds.markRefunded`）都把 `product.update` + `inventoryLog.create` 放在同一 `$transaction` 内。日志写失败会回滚业务（这是优点，避免「业务成功但流水丢失」）。
- 结论：事务一致。

### 问题 2：cancel 退库时 before stock 来源
- 严重程度：**未发现**
- `tx.product.findUnique` 拿 beforeStock 再 update，返回 updated 拿 afterStock。两者在同一 tx 内，对同一行操作（Prisma 默认 REPEATABLE READ + 行锁），不会出现竞态。
- 结论：安全。

### 问题 3：adjustStock before == after 时短路
- 严重程度：**Low**
- 位置：`admin-products.service.ts` `adjustStock`
- 问题：`if (afterStock === beforeStock) return before` 直接返回，不写流水。这意味着「把库存从 80 改成 80」不会产生日志。
- 影响：演示版合理（无变更不写日志）；生产化可能需要审计「运营误操作无变更」也写一条。
- 修复建议：可选——把相等也算作一次 adjust 流水，type=3 quantity=0。
- 验证建议：跑 `PATCH /products/1/stock { stock: 当前值 }`，查 audit_log 看是否有记录。

---

## Commit: 6d227b7 AuditLog + AuditInterceptor

- 作者：zergzerg
- 时间：2026-09-11 21:51
- 文件：`server/src/audit/`

### 问题 1：payload 敏感字段过滤范围
- 严重程度：**Medium**
- 类型：安全 / 数据风险
- 位置：`server/src/audit/audit.interceptor.ts` `sanitize()`
- 问题：`SENSITIVE_KEYS` 只列了 password / passwordHash / newPassword / oldPassword / token / accessToken / refreshToken。但实际接口可能传其他敏感字段（如邮箱验证码、二级密码、身份证号、手机号等），目前不会过滤。
- 影响：演示版字段范围可控；生产化需维护一份较完整敏感字段黑名单（或白名单——只保留非敏感字段）。
- 修复建议：把 `sanitize` 改成「按 schema 白名单」：根据 controller 路径 / DTO 类型自动判定哪些字段安全。当前是黑名单机制，长尾字段风险大。
- 验证建议：跑 `POST /api/admin/auth/login { username, password }`，看 audit_logs.payload 里 password 是否被替换。

### 问题 2：大 payload 写入性能
- 严重程度：**Medium**
- 类型：可靠性
- 位置：`audit.interceptor.ts` `audit.write` 入参 `payload`
- 问题：演示版直接存整个 JSON body。如果某个 endpoint body 巨大（如批量导入商品，body 有几千条记录），audit_log 行大小会膨胀，PG 单行超过 1 GB 会报错；查询性能也下降。
- 影响：当前 demo 接口 body 都很小，无实际风险；生产化需限制 payload 体积（如截断超过 4KB 的字符串、或只存前 N 个字符）。
- 修复建议：在 service.write 中做 `JSON.stringify(payload).slice(0, 4096)` 截断。
- 验证建议：模拟一个 10KB body 写入，看是否被截断。

### 问题 3：错误请求也写日志（审计信号）
- 严重程度：**未发现**（设计如此）
- `tap.error` 捕获 4xx / 5xx，action 后缀 `_failed`，payload 附 errorMessage。这是**有意为之**，用于审计越权尝试 / 业务异常。
- 风险：失败请求可能高频（密码输错、重复提交），导致 audit_log 暴增。
- 缓解建议：生产化阶段可对 `auth/login_failed` 做单独限流，不进 audit_log 或单独表。

### 问题 4：resource 解析启发式
- 严重程度：**Low**
- 位置：`audit.interceptor.ts` `parseUrl`
- 问题：`/api/admin/inventory/products/123/threshold` 解析为 `resource='inventory'`、`resourceId=123`、`action='threshold'`。但实际语义是「inventory_products 上的 threshold 操作」，丢失了「products」上下文。
- 影响：日志可读性差。
- 修复建议：用 `@AuditResource('inventory.product')` 装饰器标注 controller 方法，interceptor 优先读 metadata，回退 URL 启发式。
- 验证建议：跑一次 `PATCH /api/admin/inventory/products/1/threshold { threshold: 50 }`，看 audit_log 的 resource / action 字段。

### 问题 5：APP_INTERCEPTOR 全局生效范围
- 严重程度：**未发现**（已验证）
- `app.module.ts` 注册 `APP_INTERCEPTOR` 是全局的，覆盖所有请求。但 `parseUrl` + `WRITE_METHODS` 限制了只对 POST/PATCH/PUT/DELETE 触发；GET 查询不写日志，性能开销可接受。
- 风险：客户端 `/api/*` 也被全局拦截。但拦截器只对写方法写日志，且客户端写操作（如下单、退款）正是我们想要审计的，所以是符合预期的。

---

## Commit: 5e26a13 Setting 模型 + 公共读白名单

- 作者：zergzerg
- 时间：2026-09-11 22:32
- 文件：`server/src/admin-settings/`、`server/src/client-settings/`

### 问题 1：白名单用前缀匹配（High）
- 严重程度：**High**
- 类型：安全 / 信息泄露
- 位置：`server/src/client-settings/client-settings.service.ts` `PUBLIC_GROUPS`
- 问题：当前白名单是「group 前缀匹配」：`site_*` / `customer_service_*` 任何 key 都会被暴露。攻击场景：admin（拿到 admin 账号）创建一个 `site_admin_password` 这样的 key，前缀匹配通过 → 客户端公共接口返回明文密码。
- 影响：admin 自己创建恶意 key 才利用得到，但 admin 已经有完全访问权限。**实质风险是「未来 admin 误操作把敏感配置存在 site_* 前缀的 key 里」会被公开暴露**。
- 修复建议：把白名单从「group 前缀」改成「**显式 key 列表**」：`['site_name', 'site_logo', 'site_description', 'icp', 'customer_service_phone', 'customer_service_wechat', 'working_hours']`，其他 key 全部拒绝。
- 验证建议：`GET /api/client/settings?keys=site_name,site_logo` 返回成功；`?keys=site_admin_password` 应返回空 items。

### 问题 2：bulkUpsert 默认 group='general'
- 严重程度：**Medium**
- 类型：业务正确性
- 位置：`server/src/admin-settings/admin-settings.service.ts` `bulkUpsert`
- 问题：管理员通过 PUT 传入一个不存在的 key 时，会自动 create 并把 group 设为 `'general'`。但 group='general' 不在 client 公共读白名单里，等于「无声创建一个不会被公共读到的 key」。
- 影响：管理员可能困惑「我刚改了 X，怎么客户端没看到？」。
- 修复建议：bulkUpsert 时若 key 不存在，service 应该返回 404 提示「key 不存在，请先在 seed / 代码中创建」；或者要求 batch body 带 `group` 字段。
- 验证建议：`PUT /api/admin/settings { updates: [{ key: 'new_undefined_key', value: 'foo' }] }`，检查数据库里是否出现 group='general' 的新 key。

### 问题 3：value 必须是对象
- 严重程度：**Low**
- 类型：API 限制
- 位置：`server/src/admin-settings/dto/setting.dto.ts` `SettingUpdateItem.value`
- 问题：`@IsObject()` 限制 value 必须是对象（包括数组）。纯字符串 / 数字无法直接存（如 `site_name: '我的小店'` 需要改成 `site_name: { value: '我的小店' }`）。
- **但**实际生效的是 seed 直接绕过 DTO 写入的，运行时的 PUT 都被前端包裹成对象。**当前演示版可以工作**（前端把 `site_name` 存为 `{value: '我的小店'}` 然后展示时 `items.site_name.value`）。
- 影响：API 不直观；如不读前端代码会困惑。
- 修复建议：把 `@IsObject()` 改成 `@IsDefined()`（任何非 undefined 值），或在 controller 层做 stringify / parse。
- 验证建议：seed 之后查 DB，看 value 字段是 `"我的小店"` 还是 `{"value": "我的小店"}`。

---

## Commit: b539005 Review 模型 + admin 模块

- 作者：zergzerg
- 时间：2026-09-11 21:04

### 问题 1：不关联 OrderItem
- 严重程度：**Low**（roadmap 决策）
- 位置：`server/prisma/schema.prisma` `Review` 模型
- 问题：review 没有 orderItemId 字段，意味着用户可以给没买过的商品写评价。生产场景通常要求「已购买才可评」。
- 影响：演示版简化。
- 修复建议：生产化时加 `orderItemId` 字段 + controller 校验；本轮不做。

### 问题 2：admin 可写 reply 但不可改 status 之外字段
- 严重程度：**未发现**（按设计）
- admin-reviews.service.ts 的 approve / block / reply 只改对应字段，不暴露 content / rating 编辑。
- 设计合理。

---

## Commit: ebcf239 优惠券 + 订单核销

- 作者：zergzerg
- 时间：2026-09-11 20:20

### 问题 1：并发核销 race
- 严重程度：**未发现**（设计考虑）
- 优惠券核销走 `$transaction` + `UserCoupon.status=1 + orderId=绑定`。同一张券被并发下单两次，第二次进入事务时 `findUnique({ where: { id: userCouponId } })` 仍是 status=0（Prisma 默认事务隔离 + 行锁）。
- 演示版不存在「双花」风险，因为：
  - 客户端下单必须 `findUnique` 拿到 userCoupon 后立刻用，且 NestJS 同步请求同一 user 不会并发。
  - 即使并发，第二个事务会等第一个 commit 后看到 status=1，触发业务校验失败。
- 结论：安全。

---

## Commit: 87d795b InventoryLog schema + InventoryService

- 作者：zergzerg
- 时间：2026-09-11 21:24

### 问题 1：INBOUND type 无 UI 入口
- 严重程度：**Low**（roadmap 决策）
- 类型 1 入库预留但无任何 controller 触发。前端没法手动加库存。
- 演示版合理。生产化建议加 admin-products.adjustStock 区分「adjust」与「restock」两个端点。

---

## Commit: 3c06848 数据导出 xlsx

- 作者：zergzerg
- 时间：2026-09-11 21:37

### 问题 1：导出不分批
- 严重程度：**Low**（演示版合理）
- `findMany` 不带 `skip/take`，demo 数据 < 1000 行无压力。
- 生产化建议加 limit / streaming。

### 问题 2：导出无审计
- 严重程度：**Low**
- GET `/api/admin/exports/*` 不写 audit_log（因为只对 POST/PATCH/PUT/DELETE 写）。
- 演示版合理。生产化建议在 controller 显式 `this.audit.write(...)`，把 export 行为作为审计事件。

---

## 总结与生产化清单

### 必须改（生产化前）

1. **客户端公共读白名单从「前缀匹配」改为「显式 key 列表」**（commit 5e26a13 问题 1，High）

### 建议改（生产化阶段）

2. AuditInterceptor 改成「schema 白名单」机制或限制 payload 大小（commit 6d227b7 问题 1 / 2，Medium）
3. admin-settings bulkUpsert 新 key 行为改为「拒绝 create」或要求 group 字段（commit 5e26a13 问题 2，Medium）
4. refunds 部分退款按比例判断退券（commit 17d6485 问题 1，Medium）
5. AuditInterceptor resource 解析改为「controller metadata 优先」提升可读性（commit 6d227b7 问题 4，Low）

### 不影响（演示版可接受）

6. reviews 不关联 OrderItem（roadmap 决策）
7. INBOUND type 无 UI（roadmap 决策）
8. 数据导出不分批（demo 数据小）
9. value @IsObject 限制（前端已 workaround）
10. adjustStock 等值短路不写日志（合理简化）

## 验证状态

- 全部 type-check（server / admin / client）通过
- 全部 migration 应用成功
- seed 数据齐全（5 users / 6 categories / 24 products / 11 reviews / 14 audit logs / 12 settings）
- 未启动 dev server 做 e2e（环境受限）

## 不在本次审查范围

- Phase 1 commits（cc04e4f 之前）
- `package-lock.json` / `pnpm-lock.yaml` 依赖锁定
- 详细的客户端 UI 测试 / 视觉回归
- 性能基准测试