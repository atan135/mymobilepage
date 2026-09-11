# 20 管理后台

> `admin/` 目录相关文档。Vue 3 + Vite + TypeScript + Vue Router + Pinia + Element Plus。

## 文档清单（Phase 1 + Phase 2）

| 文件 | 对应页面 | 权限点 |
| --- | --- | --- |
| `01-技术栈与启动.md` | — | — |
| `02-账号权限与登录.md` | `LoginView` | — |
| `03-仪表盘.md` | `DashboardView` | `dashboard:view` |
| `04-用户管理.md` | `UserListView` | `user:list` / `user:detail` |
| `05-商品与分类管理.md` | `CategoryListView` + `ProductListView` | `category:*` / `product:*` |
| `06-订单管理.md` | `OrderListView` | `order:list` / `order:detail` / `order:ship` |
| `07-内容管理.md` | `BannerListView` + `AnnouncementListView` | `banner:*` / `announcement:*` |
| `08-优惠券与促销.md` | `CouponListView` + `CouponClaimsView` | `coupon:*` |
| `09-库存预警.md` | `InventoryWarningListView` + `InventoryLogListView` | `inventory:list` / `inventory:warning` |
| `10-评价管理.md` | `ReviewListView` + `ReviewDetailView` | `review:list` / `review:detail` |
| `11-退款与售后.md` | `RefundListView` + `RefundDetailView` | `refund:list` / `refund:detail` |
| `12-数据导出.md` | （嵌入订单 / 商品 / 库存流水列表 Dialog） | `export:orders` / `export:products` / `export:inventory_logs` |
| `13-操作日志.md` | `AuditLogListView` | `audit:view` |
| `14-系统设置.md` | `SettingsView` | `setting:list`（编辑按 group 拆 5 个权限码） |

## 业务模块文档统一模板

每个业务模块文档遵循以下结构，方便对照阅读：

1. **模块定位** — 这个模块做什么、谁会用
2. **涉及数据表** — 列出涉及到的 Prisma 表，链向 `10-服务端/03-数据库Schema说明.md`
3. **Server 接口清单** — 路径、方法、请求参数、返回结构、所需权限码
4. **Admin 路由与页面** — 路由路径、对应组件文件、关键子组件
5. **关键流程** — 必要时配 Mermaid 时序图 / 状态机
6. **权限点** — 该模块涉及的权限码及用途

## 阅读建议

- 接手模块前先看对应的 `xx-xxx管理.md`，按上述模板章节顺序读
- 涉及权限 / Token 的问题同时查 `02-账号权限与登录.md` 和 `10-服务端/04-认证与权限体系.md`
- 涉及数据表结构的问题查 `10-服务端/03-数据库Schema说明.md`
