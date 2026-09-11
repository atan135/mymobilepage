import { Module } from '@nestjs/common'
import { PassportModule } from '@nestjs/passport'
import { AuthModule } from '../auth/auth.module'
import { CouponsController } from './coupons.controller'
import { CouponsService } from './coupons.service'

/**
 * 前台优惠券模块。
 * 与 ClientOrdersModule 同源：AuthModule + PassportModule.register
 * 用于让 JwtAuthGuard 在本模块的 injector 里能解析到 AuthModuleOptions。
 */
@Module({
  imports: [AuthModule, PassportModule.register({ defaultStrategy: 'jwt' })],
  providers: [CouponsService],
  controllers: [CouponsController],
  exports: [CouponsService]
})
export class CouponsModule {}
