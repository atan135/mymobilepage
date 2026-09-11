import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query
} from '@nestjs/common'
import { RequirePermission } from '../admin-auth/decorators/require-permission.decorator'
import { AdminInventoryService } from './admin-inventory.service'
import {
  QueryInventoryLogDto,
  UpdateProductThresholdDto
} from './dto/inventory.dto'

@Controller('admin/inventory')
export class AdminInventoryController {
  constructor(private readonly svc: AdminInventoryService) {}

  @RequirePermission('inventory:list')
  @Get('logs')
  listLogs(@Query() q: QueryInventoryLogDto) {
    return this.svc.listLogs(q)
  }

  @RequirePermission('inventory:warning')
  @Get('warnings')
  warnings() {
    return this.svc.warnings()
  }

  @RequirePermission('inventory:warning')
  @Patch('products/:id/threshold')
  setThreshold(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductThresholdDto
  ) {
    return this.svc.setThreshold(id, dto)
  }
}
