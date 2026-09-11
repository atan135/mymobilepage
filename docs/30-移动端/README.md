# 30 移动端

> `client/` 目录相关文档。Vue 3 + Vite + TypeScript + Vue Router + Pinia + Vant 5，面向 H5 / 移动端用户。

## 文档清单

| 文件 | 内容 |
| --- | --- |
| `01-技术栈与启动.md` | Vite + Vue3 + Vant5 + Pinia + ofetch 技术栈细节 |
| `02-路由与页面结构.md` | 所有页面、路由表、TabBar 布局 |
| `03-状态管理与接口调用.md` | Pinia store（user、cart）、ofetch 封装、token 自动注入 |
| `04-核心业务流程.md` | 下单 / 支付流程图（Mermaid） |
| `05-业务模块说明.md` | 首页 / 商品 / 购物车 / 订单 / 个人中心 各模块说明 |

## 阅读建议

- 接手 client 端先看 `01-技术栈与启动.md` 和 `02-路由与页面结构.md`
- 了解请求链路（store → API → server）看 `03-状态管理与接口调用.md`
- 改下单流程 / 支付流程必须先读 `04-核心业务流程.md`
- 具体页面逻辑查 `05-业务模块说明.md`

## 关键约定

- 所有接口走 `/api/*` 前缀（不含 `/admin`），Vite proxy 转发到 `localhost:3000`
- 登录态通过 `useUserStore` + localStorage 持久化
- 购物车数据走 `useCartStore`（仅本地持久化，不入库）
- 所有需要登录的路由在 `meta.requiresAuth = true`，由全局前置守卫校验
