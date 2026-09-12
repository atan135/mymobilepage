-- CreateIndex: Phase 3 / 客户端评价入口
-- 每订单每商品仅允许 1 条评价（DB 兜底, 与 client-reviews.service.ts 中的 assertCanReview 配合）
CREATE UNIQUE INDEX "uniq_review_per_order_product"
 ON "reviews"("order_id", "product_id");
