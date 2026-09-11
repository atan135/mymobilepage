import { Body, Controller, Get, Post, UseGuards, Req } from '@nestjs/common'
import type { Request } from 'express'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { JwtAuthGuard } from './strategies/jwt-auth.guard'

interface AuthedRequest extends Request {
  user: { sub: number; username: string }
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto)
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto)
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  profile(@Req() req: AuthedRequest) {
    return { userId: req.user.sub, username: req.user.username }
  }
}