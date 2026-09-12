# AGENTS.md — mymobilepage 项目 AI 协作指南

> 本文件供 AI 协作时快速理解项目结构、约定与坑位。完整的项目文档在 `docs/`，请优先查阅文档。

## 1. 项目定位

单商家商城演示项目，三端一体的 npm workspaces monorepo：

| 端 | 目录 | 端口 | 技术栈 |
| --- | --- | --- | --- |
| 移动端 H5 商城 | `client/` | 5173 | Vue 3.5 + Vant 4 + Pinia + ofetch |
| 管理后台 | `admin/` | 5174 | Vue 3.5 + Element Plus + Pinia + ECharts |
| 服务端 | `server/` | 3000 | NestJS 12 + Prisma 6 + PostgreSQL |

当前阶段：Phase 1 + Phase 2 全部完成（详见 `summary/admin-roadmap.md`）。

## 2. 完整文档入口（必读）

`docs/` 是按章节组织的中文文档库：

- 新成员入职：`docs/00-总览与入门/` → `10-服务端/` → `20-管理后台/` → `30-移动端/`
- 接手具体模块：先查 `docs/<章节>/README.md` 找对应章节文档
- 后台业务模块文档统一模板：**模块定位 → 涉及数据表 → Server 接口清单 → Admin 路由与页面 → 关键流程 → 权限点**
- 数据库结构：`docs/10-服务端/03-数据库Schema说明.md` 含 ER 图
- 服务端模块索引：`docs/10-服务端/02-模块总览.md`

**禁止在没有读 `docs/` 的情况下凭猜测改动架构。**

## 3. 启动命令

```bash
npm install                  # 一次性装齐三端依赖
npm run prisma:migrate       # 服务端：创建数据库表
npm run prisma:seed          # 服务端：写入初始数据 + 默认账号

npm run dev:server           # 终端 A：服务端
npm run dev:admin            # 终端 B：管理后台
npm run dev:client           # 终端 C：移动端
```

类型检查与构建：

```bash
npm run type-check:{client,admin,server}
npm run build:{client,admin,server}
```

详细步骤与排错：`docs/00-总览与入门/02-快速开始.md`。

## 4. 路径与命名空间

服务端通过 `main.ts` 的 `app.setGlobalPrefix('api')` 统一前缀：

- 前台公开接口：`/api/<path>`（baseURL 在 `client/src/api/request.ts`）
- 后台接口：`/api/admin/<path>`（baseURL 在 `admin/src/api/request.ts`）
- 前台登录：`POST /api/auth/login`（移动端）
- 后台登录：`POST /api/admin/auth/login`（admin 端）

开发期用 Vite Proxy，无需关心 CORS；生产环境必须配 Nginx 反代。

## 5. 认证与权限（核心约定）

- **两套 JWT**：`JWT_SECRET`（前台）和 `JWT_ADMIN_SECRET`（后台）**必须不同**，否则权限隔离失效
- 后台所有 `/api/admin/*` 接口走 `PermissionsGuard`（在 `server/src/admin-auth/admin-auth.module.ts` 通过 `APP_GUARD` 全局注册）
- 公开端点用 `@Public()` 装饰器跳过守卫（仅 `POST /api/admin/auth/login`）
- 权限码格式：`<module>:<action>`，全小写，例如 `product:create`、`order:ship`
- 前台校验走 `JwtAuthGuard`（passport-jwt），由各 controller 通过 `@UseGuards(JwtAuthGuard)` 显式启用
- 详情 + 时序图：`docs/10-服务端/04-认证与权限体系.md`

## 6. Commit 规范

仓库已沿用：`<type>(<scope>): <subject>`，中文动词开头，subject 不超过 50 字。

- `type`：`feat` / `fix` / `docs` / `refactor` / `chore` / `style` / `test`
- `scope`：`client` / `admin` / `server` / `summary` / `monorepo`
- 一事一提交：`docs/`、代码、配置默认拆分提交（`summary/` 不入库，详见 §9）

## 7. 已知坑位（不要再踩）

| # | 现象 | 真相 |
| --- | --- | --- |
| 1 | 默认账号 | seed 写死 `admin/admin123`、`operator/admin123`、`alice~eve/user123`，**上线前必改** |
| 2 | JWT_SECRET | 前台/后台必须用不同 secret，否则 Token 互相通过校验 |
| 3 | `users` 表加 `status` 字段 | 迁移 `20260912000322_phase2_add_user_status/` 已落地，默认 `1`；`AuthService.login` 暂未校验禁用态，仅运营标记 |
| 4 | `DELETE /api/admin/products/:id` | 已挂 `@RequirePermission('product:delete')`，不是无权限 |
| 5 | APP_GUARD 注册 | `PermissionsGuard` 已通过 `APP_GUARD` provider 全局生效，不要再加 `useGlobalGuards` |
| 6 | 后台菜单显示 | `admin/src/layouts/AdminLayout.vue` 的 `menuItems` 与路由 `meta.permission` 同步，否则菜单看不到 |
| 7 | 主题色覆盖 | `admin/src/styles/main.css` 在 `:root` 显式声明 `--el-color-primary` 等品牌主色；`:root[data-theme="dark"]` 仅重写 `--app-*` 自有变量；Element Plus 暗色由其内置 `.dark` 类提供，无需重复声明 |
| 8 | 客户端 mock 注释 | 已清理：`client/src/api/request.ts` 头部 mock 说明块 + 未使用的 `delay()` 导出已删除 |
| 9 | 客户端登录页底部文案 | 已清理：client/src/views/LoginView.vue 的 .hint div + 对应 .hint CSS 样式已删除 |
| 10 | 函数式弹窗白板 | Vant 函数 API（showToast / showConfirmDialog）不被 unplugin-vue-components 自动注入样式；main.ts 的全量 vant/lib/index.css 在 HMR 下偶尔丢失样式，导致弹窗容器表现成白板。在 client/src/main.ts 集中显式 import vant/es/toast/style/index、vant/es/dialog/style/index、vant/es/action-sheet/style/index 兜底，新增函数式 API 不用动 view |
| 11 | 分类页侧边栏点击报错 | Vant 4 <van-sidebar> 的 v-model 是 children 数组下标（useChildren 的 index.value），不是分类主键。把 activeId（分类 id）直接 v-model 上去，点击会把下标当成 categoryId 发请求，点第一个分类时 categoryId=0 会触发 QueryProductDto @Min(1) 校验 400。client/src/views/CategoryView.vue 用 activeIndex computed 在「分类 id」与「侧边栏下标」之间互译，业务侧仍用 activeId |

完整 FAQ：`docs/00-总览与入门/04-开发约定与常见问题.md`。

## 8. 新增功能的标准流程

**新增后台业务模块：**

1. 服务端 `server/src/admin-<module>/` 创建 module + controller + service + dto
2. 在 `server/src/app.module.ts` 的 `imports` 注册
3. 在 `server/prisma/seed.ts` 的 `ADMIN_PERMISSIONS` 数组加新权限码
4. 在 controller 方法上加 `@RequirePermission('xxx:yyy')`
5. 在 `admin/src/api/admin-<module>.ts` 写 ofetch 封装
6. 在 `admin/src/router/index.ts` 加路由 + `meta.permission`
7. 在 `admin/src/layouts/AdminLayout.vue` 的 `menuItems` 加菜单项
8. 在 `docs/20-管理后台/<NN>-<模块名>.md` 补文档（按统一模板）
9. 重跑 `npm run prisma:seed` 让 `operator` 拿到新权限码

**新增移动端页面：**

1. 在 `client/src/views/XxxView.vue` 创建组件
2. 在 `client/src/router/index.ts` 加路由 + `meta.requiresAuth`（如需登录）
3. 在 `client/src/api/<resource>.ts` 写 ofetch 封装

## 9. 禁止事项

- 不要提交 `.env` / `node_modules/` / `dist/` / `*.local`（已被 `.gitignore` 覆盖，但仍需复核）
- 不要把 `docs/` 改动与代码改动混在同一个 commit
- 不要擅自修改 `server/src/admin-orders/dto/order.dto.ts` 的 `ORDER_TRANSITIONS` 跨级跳
- 不要擅自删除默认账号或改 seed 密码（除非准备替换为生产配置）
- 不要重新发明路由前缀 / 权限码命名风格；先查 `docs/10-服务端/04-认证与权限体系.md` 与 `docs/00-总览与入门/04-开发约定与常见问题.md` 第 4 节
- 不要在没有核对代码的情况下改文档中的事实描述（如权限装饰器、模块注册状态）


- 不要主动提交 `summary/` 下的任何文件（已加入 `.gitignore`）：`summary/` 仅作为本地工作笔记 / 草稿 / 临时记录的 scratchpad。需要入库时，由用户明确说明并转移至 `docs/` 下的合适章节后，再走标准 commit 流程。

## 10. 相关文件位置速查

- 三端协作数据流图：`docs/00-总览与入门/03-架构与目录结构.md`
- ER 图与表结构：`docs/10-服务端/03-数据库Schema说明.md`
- 服务端权限码完整列表：`docs/10-服务端/04-认证与权限体系.md` 第 5 节
- 后台路由菜单权限对应：`docs/20-管理后台/02-账号权限与登录.md`
- 默认账号清单：`docs/10-服务端/06-数据迁移与Seed脚本.md` 第 4 节
- Phase 1 + Phase 2 整体完成态：`summary/admin-roadmap.md`

