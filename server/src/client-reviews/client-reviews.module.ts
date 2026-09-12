import { Module } from '@nestjs/common'
import { PassportModule } from '@nestjs/passport'
import { AuthModule } from '../auth/auth.module'
import { ClientReviewsController } from './client-reviews.controller'
import { ProductReviewsPublicController } from './product-reviews-public.controller'
import { ClientReviewsService } from './client-reviews.service'

@Module({
  imports: [AuthModule, PassportModule.register({ defaultStrategy: 'jwt' })],
  providers: [ClientReviewsService],
  // 注意：ProductReviewsPublicController 不挂 JwtAuthGuard（公开接口），与 ClientReviewsController（需登录）独立命名空间
  controllers: [ClientReviewsController, ProductReviewsPublicController]
})
export class ClientReviewsModule {}
