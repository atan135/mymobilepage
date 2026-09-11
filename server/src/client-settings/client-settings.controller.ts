import { Controller, Get, Query } from '@nestjs/common'
import { Public } from '../admin-auth/decorators/public.decorator'
import { ClientSettingsService } from './client-settings.service'

@Controller('client/settings')
export class ClientSettingsController {
  constructor(private readonly svc: ClientSettingsService) {}

  @Public()
  @Get()
  list(@Query('keys') keys?: string | string[]) {
    const arr = keys
      ? (Array.isArray(keys) ? keys : keys.split(',').map((s) => s.trim()).filter(Boolean))
      : undefined
    return this.svc.list(arr)
  }
}
