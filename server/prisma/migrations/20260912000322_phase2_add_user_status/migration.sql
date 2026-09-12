-- AlterTable: users 新增 status 字段，配合 admin-users 列表过滤与启禁用场景。
-- 1 启用 / 0 禁用；前端 default(1) 兼容历史数据。
ALTER TABLE "users" ADD COLUMN "status" INTEGER NOT NULL DEFAULT 1;
