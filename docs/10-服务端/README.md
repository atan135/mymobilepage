# 10 服务端

> `server/` 目录相关文档。NestJS 12 + Prisma 6 + PostgreSQL，对外统一走 `/api` 前缀，其中后台接口走 `/api/admin/*`，移动端走 `/api/*`（不含 admin）。

## 文档清单

| 文件 | 内容 |
| --- | --- |
| `01-技术栈与启动.md` | 技术栈细节、环境变量、启动 / 构建 / 数据库迁移命令 |
| `02-模块总览.md` | 所有 NestJS Module 索引（前台 / 后台 / 公共） |
| `03-数据库Schema说明.md` | Prisma 表结构、ER 关系、迁移历史 |
| `04-认证与权限体系.md` | 两套 JWT（client / admin）、Guards、`@RequirePermission` 装饰器、Token 流程 |
| `05-通用服务与中间件.md` | 全局 ValidationPipe、HttpExceptionFilter、helmet、CORS、PrismaService |
| `06-数据迁移与Seed脚本.md` | `prisma migrate` 命令约定、seed.ts 内容、初始账号清单 |

## 阅读建议

- 接手具体模块前先看 `02-模块总览.md` 了解全貌
- 数据库相关问题查 `03-数据库Schema说明.md`
- 权限 / Token 相关问题查 `04-认证与权限体系.md`
- 调试全局行为（异常、跨域、校验）查 `05-通用服务与中间件.md`
- 改 Schema 或重置数据查 `06-数据迁移与Seed脚本.md`

## 关键约定

- 所有接口统一前缀 `/api`，后台模块使用 `@Controller('admin/xxx')` 形成 `/api/admin/xxx`
- 后台权限通过 `@RequirePermission('module:action')` 装饰器声明
- 前台通过 `AuthGuard('jwt')`（passport-jwt）校验用户身份
- 所有写操作建议经 Prisma 事务处理（详见各模块文档）
