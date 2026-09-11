-- AlterTable: orders 新增 refunded_at 字段, 与 markRefunded 同步订单状态配套。
ALTER TABLE "orders" ADD COLUMN "refunded_at" TIMESTAMP(3);
