import { Global, Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { JwtStrategy } from './strategies/jwt.strategy'
import { JwtAuthGuard } from './strategies/jwt-auth.guard'
import { UsersModule } from '../users/users.module'

/**
 * @Global 让 PassportModule 配置（'jwt' strategy）和 JwtModule 实例
 * 在整个应用可见，避免使用 JwtAuthGuard 的模块（如 ClientOrdersModule）
 * 重复注册或遇 DI 解析失败。
 */
@Global()
@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') ?? 'dev-secret',
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRES_IN', '7d') as unknown as number
        }
      })
    })
  ],
  providers: [AuthService, JwtStrategy, JwtAuthGuard],
  controllers: [AuthController],
  exports: [AuthService, JwtAuthGuard, JwtStrategy]
})
export class AuthModule {}
