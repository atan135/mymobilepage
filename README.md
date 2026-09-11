# mymobilepage

Monorepo: 移动端 H5 商城 + 管理后台 + 服务端。

```
mymobilepage/
├── client/   Vue 3 + Vant 5 + TS + Vite  （移动端商城，本阶段重点）
├── admin/    管理后台  （待搭建）
└── server/   NestJS    （待搭建）
```

## 快速开始

```bash
# 安装所有子项目依赖
npm install

# 启动移动端
npm run dev:client
```

## 后续规划

- `admin/`：商家/运营管理后台，技术栈待定（Ant Design Pro / Element Plus / Arco Design 之一）。
- `server/`：NestJS + Prisma + MySQL/PostgreSQL，提供 REST API 给 client / admin。