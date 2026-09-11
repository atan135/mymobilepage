import { Global, Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { JwtModule } from '@nestjs/jwt'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { AdminAuthService } from './admin-auth.service'
import { AdminAuthController } from './admin-auth.controller'
import { PermissionsGuard } from './guards/permissions.guard'

/**
 * 全局模块：AdminJwtAuthGuard 和 PermissionsGuard 用到的 JwtService / ConfigService
 * 不需要在每个 admin 子模块重复 import。
 */
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ADMIN_SECRET') ?? 'dev-admin-secret',
        signOptions: {
          expiresIn: config.get<string>('JWT_ADMIN_EXPIRES_IN', '7d') as unknown as number
        }
      })
    })
  ],
  controllers: [AdminAuthController],
  providers: [AdminAuthService, PermissionsGuard, { provide: APP_GUARD, useClass: PermissionsGuard }],
  exports: [AdminAuthService, JwtModule]
})
export class AdminAuthModule {}