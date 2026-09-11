import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { AdminAuthService } from './admin-auth.service'
import { AdminAuthController } from './admin-auth.controller'
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy'
import { PermissionsGuard } from './guards/permissions.guard'

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'admin-jwt' }),
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
  providers: [
    AdminAuthService,
    AdminJwtStrategy,
    PermissionsGuard,
    // 全局启用 PermissionsGuard（每个路由可以单独用 @RequirePermission 标）
    { provide: APP_GUARD, useClass: PermissionsGuard }
  ],
  exports: [AdminAuthService, JwtModule]
})
export class AdminAuthModule {}