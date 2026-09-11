-- AlterTable: reviews 新增 order_id 字段（可选 + FK），
-- 标记"该评价来源于哪个订单"，为后续"购买校验"打底。
ALTER TABLE "reviews" ADD COLUMN "order_id" INTEGER;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL;

-- CreateIndex
CREATE INDEX "reviews_order_id_idx" ON "reviews"("order_id");
