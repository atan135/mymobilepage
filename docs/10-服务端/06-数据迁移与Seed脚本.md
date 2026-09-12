# 06 数据迁移与 Seed 脚本

> Prisma 迁移命令约定、迁移历史、`seed.ts` 行为、初始账号清单。

## 1. 迁移命令

```bash
# 推荐（开发期）
npm run prisma:migrate
# 等价：npx prisma migrate dev
# 行为：检测 schema 变更 → 生成新迁移文件 → 应用到数据库 → 重新生成 client

# 仅生成 client（schema 已改完但不想跑迁移）
npm run prisma:generate

# 可视化数据库管理界面（默认 http://localhost:5555）
npm run prisma:studio

# 重置并写入初始数据（**会清空所有业务表**）
npm run prisma:seed
```

> `prisma:seed` 在 `server/package.json` 里配置：
> ```json
> "prisma": {
>   "seed": "tsx prisma/seed.ts"
> }
> ```

## 2. 迁移历史

路径：`server/prisma/migrations/`

| 迁移名 | 时间戳 | 阶段 | 内容 |
| --- | --- | --- | --- |
| `init` | `20260911055156` | 初始 | `users` / `categories` / `products` / `banners` |
| `phase1_admin_and_orders` | `20260911063637` | Phase 1 | `admin_users` / `admin_roles` / `announcements` / `orders` / `order_items` / `refund_requests` |
| `phase2_coupons` | `20260911120815` | Phase 2 | `orders` 加 `original_amount` / `discount_amount`；新增 `coupons` / `user_coupons` |
| `phase2_reviews` | `20260911125900` | Phase 2 | 新增 `reviews` |
| `phase2_inventory` | `20260911132309` | Phase 2 | `products` 加 `threshold`；新增 `inventory_logs` |
| `phase2_audit_logs` | `20260911134947` | Phase 2 | 新增 `audit_logs` |
| `phase2_settings` | `20260911143048` | Phase 2 | 新增 `settings` |
| `phase2_add_refunded_at` | `20260912000000` | Phase 2 | `orders` 加 `refunded_at` |
| `phase2_add_review_order_id` | `20260912000001` | Phase 2 | `reviews` 加 `order_id` |
| `phase2_add_user_status` | `20260912000322` | Phase 2 | `users` 加 `status` |

迁移命名约定：`<时间戳>_<简述>`。Prisma 自动按时间戳升序应用。

### 新增迁移的标准流程

1. 修改 `server/prisma/schema.prisma`
2. 跑 `npm run prisma:migrate`，Prisma 会要求输入迁移名（kebab-case 英文 / 中文皆可，建议英文）
3. 检查自动生成的 `server/prisma/migrations/<时间戳>_<name>/migration.sql`
4. 提交迁移文件夹与 schema 改动

> 不要手动编辑已应用的迁移文件。需要回滚用 `prisma migrate reset`（清库重跑）或 `prisma migrate resolve`。

## 3. Seed 脚本概览

文件：`server/prisma/seed.ts`，执行 `npm run prisma:seed` 时跑。

执行流程：

1. **清理业务表**（按外键依赖顺序）
   ```
   refund_requests → order_items → orders
   → announcements → banners → reviews → products → categories
   → users → admin_users → admin_roles
   ```
2. **写入分类**：6 个固定分类（手机数码 / 服饰鞋包 / 美妆个护 / 家居生活 / 食品生鲜 / 运动户外）
3. **写入商品**：每个分类 4 个商品，共 24 个。图片用 `picsum.photos` 随机图，价格递增，库存递减。最后 3 个商品阈值设 90，演示预警
4. **写入用户**：5 个用户（`alice` / `bob` / `carol` / `dave` / `eve`），密码统一 `user123`
5. **写入轮播图**：3 张，链到 `/home`
6. **写入订单**：10 单，分布在最近 0~8 天，覆盖 status 0/1/2/3
7. **写入评价**：11 条，覆盖 status 0/1/2、1~5 星、部分带图、部分带商家回复
8. **写入后台角色**：`SUPER_ADMIN`（权限 `['*']`）+ `ADMIN`（41 条权限码）
9. **写入后台账号**：`admin` + `operator`，密码统一 `admin123`
10. **写入审计日志**：14 条 demo（login / create / update / approve / refund / block / grant / ship / delete）
11. **写入系统设置**：12 条 KV（site / customer_service / payment / shipping 四组）

## 4. 默认账号清单

### 后台

| 用户名 | 密码 | 角色 | 权限范围 |
| --- | --- | --- | --- |
| `admin` | `admin123` | `SUPER_ADMIN` | 所有（含 `*` 通配） |
| `operator` | `admin123` | `ADMIN` | 见下表 |

### 前台

| 用户名 | 昵称 | 手机号 | 密码 |
| --- | --- | --- | --- |
| `alice` | 小爱 | 13800000001 | `user123` |
| `bob` | 阿波 | 13800000002 | `user123` |
| `carol` | 小卡 | 13800000003 | `user123` |
| `dave` | 老戴 | 13800000004 | `user123` |
| `eve` | 伊芙 | 13800000005 | `user123` |

### ADMIN 角色权限码

```text
dashboard:view

user:list, user:detail
product:list, product:create, product:edit
product:on_off, product:adjust_stock

category:list, category:create, category:edit

order:list, order:detail, order:ship

banner:list, banner:create, banner:edit

announcement:list, announcement:create, announcement:edit
```

> **不在 ADMIN 权限集合中**（仅 `SUPER_ADMIN` 通过 `*` 通配可访问）：
`user:edit`、`category:delete`、`product:delete`、`banner:delete`、`announcement:publish`、`announcement:delete`、`order:cancel`。

> 注意：这 7 个权限码在 `server/src/admin-auth/types.ts` 中声明、对应 controller 上有 `@RequirePermission()`，但 seed 没分配给 ADMIN。这是 known issue：前端按钮的 `v-permission` 会自动隐藏，但若绕过指令直接调接口会被 `PermissionsGuard` 拦截。

**ADMIN 实际持有、但文档早期版本未列出的敏感操作**：
`coupon:delete`、`coupon:grant`、`refund:approve`、`refund:reject`、`refund:refund`。
>
> 实际后台路由上：当前阶段部分删除 / 状态变更接口**未全部实现**（如无 `banner:delete` 路由），所以 ADMIN 角色权限码与路由权限码之间存在轻微不对齐；详见 `20-管理后台/02-账号权限与登录.md`。

## 5. Seed 中的关键代码片段

### 密码哈希

```ts
import * as bcrypt from 'bcryptjs'
const hash = await bcrypt.hash('admin123', 10)
```

> bcrypt rounds = 10 是 seed 写死。生产环境建议 12+。

### 订单模板

```ts
const orderTemplates = [
  { dAgo: 0, status: 1, qty: 2, items: [0, 3] }, // 今日 已付款
  { dAgo: 0, status: 2, qty: 1, items: [1] },    // 今日 已发货
  { dAgo: 0, status: 3, qty: 1, items: [5] },    // 今日 已完成
  { dAgo: 0, status: 0, qty: 1, items: [7] },    // 今日 待付款
  { dAgo: 0, status: 0, qty: 2, items: [10, 11] }, // 今日 待付款
  { dAgo: 1, status: 3, qty: 1, items: [2] },    // 昨日 已完成
  { dAgo: 2, status: 3, qty: 2, items: [4, 8] },
  { dAgo: 4, status: 1, qty: 1, items: [6] },
  { dAgo: 6, status: 3, qty: 1, items: [9] },
  { dAgo: 8, status: 3, qty: 2, items: [12, 14] }
]
```

每单按 `dAgo` 计算 `createdAt`、`paidAt`、`shippedAt`、`completedAt`，并根据状态写运单号。

### 商品销量自增

```ts
for (const it of items) {
  await prisma.product.update({
    where: { id: it.productId },
    data: { sales: { increment: it.quantity } }
  })
}
```

> seed 不会扣库存；商品初始库存是 `100 - i`。下单演示时库存会真实减少。

## 6. 重新 Seed 的代价

执行 `npm run prisma:seed` 会**先清空所有业务表再重写**：

- 所有手动创建的用户 / 管理员账号会丢
- 所有手动调整的商品 / 分类 / 订单会丢
- 退款申请表也清空

**操作前请备份**或避免在生产数据库上跑。

## 7. 相关文档

- 数据库表结构：`03-数据库Schema说明.md`
- 权限码完整列表：`04-认证与权限体系.md` 第 5 节
- 模块清单：`02-模块总览.md`
