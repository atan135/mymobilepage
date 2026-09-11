# mymobilepage

> 单商家商城演示项目（移动端 H5 商城 + 管理后台 + 服务端）。Phase 1 + Phase 2 已完成，演示完整业务流程。

## 技术栈

| 端 | 目录 | 端口 | 技术 |
| --- | --- | --- | --- |
| 移动端 H5 商城 | `client/` | 5173 | Vue 3.5 + Vant 5 + Pinia + ofetch |
| 管理后台 | `admin/` | 5174 | Vue 3.5 + Element Plus + Pinia + ECharts |
| 服务端 | `server/` | 3000 | NestJS 12 + Prisma 6 + PostgreSQL |

monorepo 管理：`npm workspaces`，三个子包共用根 `node_modules`。

## 目录结构

```
mymobilepage/
├── client/        移动端 H5 商城
├── admin/         管理后台
├── server/        NestJS 服务端
├── docs/          按章节组织的中文文档库（00 总览 / 10 服务端 / 20 后台 / 30 移动端 / 40 部署）
├── summary/       路线图 / 评审 / 阶段总结
├── AGENTS.md      AI 协作指南（先读这个）
└── package.json   workspaces 根配置
```

## 快速开始

```bash
# 1. 安装所有子项目依赖
npm install

# 2. 准备 PostgreSQL（本地或 Docker），新建库 mymobilepage

# 3. 复制环境变量模板
cp server/.env.example server/.env   # 编辑 DATABASE_URL 等

# 4. 数据库迁移 + 写入种子数据
npm run prisma:migrate
npm run prisma:seed

# 5. 启动三端（各开一个终端）
npm run dev:server    # NestJS @ 3000
npm run dev:admin     # 管理后台 @ 5174
npm run dev:client    # 移动端商城 @ 5173
```

详细步骤 + 排错：`docs/00-总览与入门/02-快速开始.md`。

## 默认账号

| 端 | 用户名 | 密码 | 角色 | 权限 |
| --- | --- | --- | --- | --- |
| 管理后台 | `admin` | `admin123` | SUPER_ADMIN | 所有权限 |
| 管理后台 | `operator` | `admin123` | ADMIN | 日常运营权限 |
| 移动端 | `alice` ~ `eve` | `user123` | 普通用户 | 下单 / 领券 / 退款 |

> **演示版硬编码**。**生产化前必改**（详见 AGENTS.md §7 坑位 #1）。

## 已实现功能

### Phase 1（基础闭环）

- 三端工程脚手架（admin / client / server）
- 后台账号 + RBAC 权限体系（双 JWT + `PermissionsGuard`）
- 仪表盘（KPI + ECharts + 热销 Top 10 + 待处理订单）
- 用户 / 商品 / 分类 / 订单 / 轮播图 / 首页公告 后台 CRUD
- 主题色覆盖（Element Plus 变量）
- client 端真实 API（商品列表 / 详情 / 下单 / 收货）

### Phase 2（业务深化）

- **2.1 优惠券 / 促销**：满减 / 折扣 / 无门槛、领取 / 核销 / 退券
- **2.2 库存预警**：`InventoryLog` 表 + `InventoryService` 统一事务、所有改 stock 的点（出库 / 退款入库 / 取消退库 / 后台调整）写流水
- **2.3 评价管理**：用户评价、后台审核 / 屏蔽 / 回复
- **2.4 退款 / 售后**：客户端申请 + 后台审批 + 状态机 + 库存 / 退券联动
- **2.5 数据导出**：订单 / 商品 / 库存流水 → xlsx（流式返回）
- **2.6 操作日志**：全局拦截器捕获所有 POST/PATCH/PUT/DELETE（含失败请求），敏感字段过滤
- **2.7 系统设置**：KV 配置（站点 / 客服 / 支付 / 运费），客户端按 key 公共读（白名单）

完整路线图：`summary/admin-roadmap.md`。
Phase 2 commit 评审：`summary/git-review-phase2.md`。

## 文档导航

| 我想知道… | 看这里 |
| --- | --- |
| 项目怎么跑起来 | `docs/00-总览与入门/02-快速开始.md` |
| 三端怎么组织 / 数据怎么流动 | `docs/00-总览与入门/03-架构与目录结构.md` |
| 服务端模块在哪 / 接口怎么调 | `docs/10-服务端/02-模块总览.md` |
| 数据库 ER 图 | `docs/10-服务端/03-数据库Schema说明.md` |
| 后台模块怎么用 | `docs/20-管理后台/` |
| 移动端页面 / 路由 | `docs/30-移动端/` |
| 怎么部署到生产 | `docs/40-部署与运维/` |
| 怎么改代码 / 有哪些坑 | `AGENTS.md` |

## 已知坑位（生产化前必改）

| # | 现象 | 真相 |
| --- | --- | --- |
| 1 | 默认账号 `admin/admin123` | 演示版写死，**上线前必改** |
| 2 | JWT_SECRET 默认值 | `.env` 模板有占位，必须用强随机串 |
| 3 | `users` 表无 `status` 字段 | 后台「禁用」前台用户只是运营标记，**生产需先改 schema** |
| 4 | client `request.ts` 注释已过时 | 「走本地 mock」是历史注释，当前全走真实 API |

完整 FAQ：`docs/00-总览与入门/04-开发约定与常见问题.md`。

## 状态

- **Phase 1**：✅ 完成
- **Phase 2**：✅ 完成（2.1~2.7）
- **Phase 2 收尾**：✅ 已做 git-review + 部署文档
- **生产化**：⏸ 未做（需改默认账号 / 强随机 JWT / 加限流 / 加监控）

## 许可

演示项目，无商业用途。
