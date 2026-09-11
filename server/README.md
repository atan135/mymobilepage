# @mymobilepage/server

NestJS + Prisma + PostgreSQL API server.

## 快速开始

```bash
# 在仓库根目录
npm install

# 1. 配置环境变量（首次）
cp server/.env.example server/.env
# 编辑 server/.env 填入真实 DATABASE_URL / JWT_SECRET

# 2. 数据库迁移（首次或 schema 变更后）
npm run -w server prisma:migrate

# 3. 启动开发服务器
npm run -w server start:dev
# 监听 http://localhost:3000/api
```

## 主要脚本

| 命令 | 说明 |
|---|---|
| `npm run -w server start:dev` | 监听模式启动（热重载） |
| `npm run -w server build` | TypeScript 编译到 `dist/` |
| `npm run -w server start:prod` | 运行编译产物 |
| `npm run -w server prisma:generate` | 重新生成 Prisma Client |
| `npm run -w server prisma:migrate` | 开发期迁移（生成 SQL + 应用） |
| `npm run -w server prisma:deploy` | 生产期只应用迁移 |
| `npm run -w server prisma:studio` | 打开 Prisma Studio 数据浏览器 |
| `npm run -w server prisma:reset` | 危险：重置数据库 |

## 模块

- `AuthModule`：注册 / 登录 / JWT 校验
- `UsersModule`：用户查询
- `CategoriesModule`：分类 CRUD
- `ProductsModule`：商品 CRUD + 分页查询

## 接口前缀

所有路由统一加 `/api` 前缀（在 `main.ts` 里 `setGlobalPrefix('api')`）。
例如 `POST /api/auth/login`。