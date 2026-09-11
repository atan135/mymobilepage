import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards
} from '@nestjs/common'
import type { Request } from 'express'
import { AdminAuthService } from './admin-auth.service'
import { AdminLoginDto } from './dto/login.dto'
import { Public } from './decorators/public.decorator'
import type { AdminJwtUser } from './strategies/admin-jwt.strategy'

interface AuthedRequest extends Request {
  user: AdminJwtUser
}

@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly auth: AdminAuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: AdminLoginDto) {
    return this.auth.login(dto)
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout() {
    return this.auth.logout()
  }

  @Get('profile')
  profile(@Req() req: AuthedRequest) {
    return this.auth.getProfile(req.user.sub)
  }
}