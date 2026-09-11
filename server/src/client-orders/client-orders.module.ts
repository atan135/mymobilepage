import { Module } from '@nestjs/common'
import { PassportModule } from '@nestjs/passport'
import { AuthModule } from '../auth/auth.module'
import { ClientOrdersService } from './client-orders.service'
import { ClientOrdersController } from './client-orders.controller'

/**
 * 客户端订单模块。
 *
 * AuthGuard('jwt') 的构造器会通过 @Inject(AuthModuleOptions) 注入
 * PassportModule.register() 提供的 options。AuthModule 虽然是 @Global，
 * 但其 imports 里的动态模块（PassportModule.register）并未 re-export，
 * Nest 在 import 链上按 export 过滤时看不到 AuthModuleOptions，
 * 所以需要在本模块再 import 一次 PassportModule.register({ defaultStrategy: 'jwt' })，
 * 让 JwtAuthGuard 在 ClientOrdersModule 的 injector 里能解析到该依赖。
 */
@Module({
  imports: [AuthModule, PassportModule.register({ defaultStrategy: 'jwt' })],
  providers: [ClientOrdersService],
  controllers: [ClientOrdersController]
})
export class ClientOrdersModule {}
