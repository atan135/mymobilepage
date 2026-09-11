# 40 部署与运维

> 本章节介绍 Phase 2 完成后的生产环境部署。

## 章节结构

- `01-环境准备.md` —— Node / PostgreSQL / PM2 / Nginx 等基础软件清单
- `02-部署步骤.md` —— 三端构建产物部署、数据库迁移、PM2 进程管理
- `03-Nginx与HTTPS.md` —— Nginx 反向代理配置 + HTTPS 证书
- `04-上线检查清单.md` —— 上线前必须逐项验证的 checklist

## 当前项目状态

- 本地三端启动跑通
- Phase 1 + Phase 2 全部功能完成
- **演示版**，以下生产化工作未做：
  - 默认账号 / 默认 JWT_SECRET 替换
  - 限流 / 防爬
  - 监控 / 告警
  - CI / CD
  - 数据库备份与归档策略

## 演示版与生产版的差异

| 项 | 演示版 | 生产版 |
| --- | --- | --- |
| 默认账号 | admin/admin123、alice~eve/user123 | 重置 + 加复杂度校验 |
| JWT_SECRET | 占位符 | 强随机串 + 定期轮换 |
| 数据库 | 本地 PostgreSQL | 专用实例 + 自动备份 |
| 进程管理 | npm run start:dev | pm2 start ecosystem.config.js |
| 反向代理 | Vite proxy（开发期） | Nginx + HTTPS |
| 静态资源 | dev server 直出 | admin/dist + client/dist 静态站点 |
| 日志 | console | 文件 + logrotate + ELK |

## 推荐部署架构

```
                ┌──────────────┐
   HTTPS ──────►│   Nginx      │
                │  (反向代理)  │
                └──┬─────┬─────┘
                   │     │
       /admin/*    │     │   /api/*
       /client/*   │     │
                   ▼     ▼
         ┌─────────┐  ┌──────────┐
         │ 静态站点 │  │ NestJS   │
         │(admin/  │  │  @3000   │
         │ client/ │  │ (pm2)    │
         │  dist)  │  └────┬─────┘
         └─────────┘       │
                            ▼
                     ┌─────────────┐
                     │ PostgreSQL  │
                     │   @5432     │
                     └─────────────┘
```