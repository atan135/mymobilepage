-- AlterTable
ALTER TABLE "products" ADD COLUMN     "threshold" INTEGER NOT NULL DEFAULT 10;

-- CreateTable
CREATE TABLE "inventory_logs" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "type" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT,
    "operator_id" INTEGER,
    "before_stock" INTEGER NOT NULL,
    "after_stock" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventory_logs_product_id_created_at_idx" ON "inventory_logs"("product_id", "created_at");

-- CreateIndex
CREATE INDEX "inventory_logs_type_created_at_idx" ON "inventory_logs"("type", "created_at");

-- AddForeignKey
ALTER TABLE "inventory_logs" ADD CONSTRAINT "inventory_logs_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_logs" ADD CONSTRAINT "inventory_logs_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
