import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query
} from '@nestjs/common'
import { RequirePermission } from '../admin-auth/decorators/require-permission.decorator'
import { AdminDashboardService } from './admin-dashboard.service'

@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly svc: AdminDashboardService) {}

  @RequirePermission('dashboard:view')
  @Get('overview')
  overview() {
    return this.svc.overview()
  }

  @RequirePermission('dashboard:view')
  @Get('sales-trend')
  salesTrend(
    @Query('days', new DefaultValuePipe(7), ParseIntPipe) days: number
  ) {
    return this.svc.salesTrend(days)
  }
}
