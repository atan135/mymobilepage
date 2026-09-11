import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'

/**
 * 库存流水类型。
 *
 * - 1 INBOUND       入库（预留：本期无 UI 入口，留待后续手动入库功能）
 * - 2 OUTBOUND      出库（订单下单扣减）
 * - 3 ADJUST        调整（后台 adjustStock 写绝对值，前/后库存相减得 diff）
 * - 4 REFUND_IN     退款入库（admin 标记已退款）
 * - 5 CANCEL_IN     取消退库（用户取消订单）
 */
export const INVENTORY_TYPES = [1, 2, 3, 4, 5] as const
export type InventoryType = (typeof INVENTORY_TYPES)[number]

export const INVENTORY_TYPE_LABELS: Record<InventoryType, string> = {
  1: '入库',
  2: '出库',
  3: '调整',
  4: '退款入库',
  5: '取消退库'
}

export const INVENTORY_TYPE_TAG_TYPE: Record<InventoryType, 'success' | 'warning' | 'info' | 'primary'> = {
  1: 'success',
  2: 'warning',
  3: 'info',
  4: 'primary',
  5: 'primary'
}

/**
 * 库存服务 —— 公共封装，所有改 stock 的点必须经过这里，保证库存变更和流水写入在同一个事务里。
 */
@Injectable()
export class InventoryService {
  /**
   * 在已存在的事务客户端中记录一次库存变更。
   *
   * - 事务调用方负责传入 `tx`（来自 `prisma.$transaction(async (tx) => ...)`）
   * - 由调用方负责先锁行 / 校验，再 update stock，最后调本方法写日志
   * - 写日志失败会让事务回滚（避免主流程成功但无流水）
   */
  async recordChange(
    tx: Prisma.TransactionClient,
    params: {
      productId: number
      type: InventoryType
      quantity: number
      beforeStock: number
      afterStock: number
      reason?: string | null
      operatorId?: number | null
    }
  ): Promise<void> {
    await tx.inventoryLog.create({
      data: {
        productId: params.productId,
        type: params.type,
        quantity: params.quantity,
        beforeStock: params.beforeStock,
        afterStock: params.afterStock,
        reason: params.reason ?? null,
        operatorId: params.operatorId ?? null
      }
    })
  }
}
