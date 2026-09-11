import { Controller, Get, Query, StreamableFile, Header } from '@nestjs/common'
import { RequirePermission } from '../admin-auth/decorators/require-permission.decorator'
import { AdminExportsService } from './admin-exports.service'
import {
  ExportOrdersDto,
  ExportProductsDto,
  ExportInventoryLogsDto
} from './dto/export.dto'

@Controller('admin/exports')
export class AdminExportsController {
  constructor(private readonly svc: AdminExportsService) {}

  private wrap(buf: Buffer, filename: string): StreamableFile {
    return new StreamableFile(buf, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${filename}"`
    })
  }

  @RequirePermission('export:orders')
  @Get('orders')
  async exportOrders(@Query() q: ExportOrdersDto): Promise<StreamableFile> {
    const buf = await this.svc.exportOrders(q)
    return this.wrap(buf, this.filename('orders', q.dateFrom, q.dateTo))
  }

  @RequirePermission('export:products')
  @Get('products')
  async exportProducts(@Query() q: ExportProductsDto): Promise<StreamableFile> {
    const buf = await this.svc.exportProducts(q)
    return this.wrap(buf, this.filename('products'))
  }

  @RequirePermission('export:inventory_logs')
  @Get('inventory-logs')
  async exportInventoryLogs(@Query() q: ExportInventoryLogsDto): Promise<StreamableFile> {
    const buf = await this.svc.exportInventoryLogs(q)
    return this.wrap(buf, this.filename('inventory-logs', q.dateFrom, q.dateTo))
  }

  private filename(prefix: string, dateFrom?: string, dateTo?: string): string {
    const ts = this.ts()
    const range = dateFrom || dateTo ? `_${dateFrom ?? 'all'}_${dateTo ?? 'all'}` : ''
    return `${prefix}${range}_${ts}.xlsx`
  }

  private ts(): string {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return [
      d.getFullYear(),
      pad(d.getMonth() + 1),
      pad(d.getDate())
    ].join('') + '-' + [
      pad(d.getHours()),
      pad(d.getMinutes())
    ].join('')
  }
}
