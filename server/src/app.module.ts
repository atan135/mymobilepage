import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import { CategoriesModule } from './categories/categories.module'
import { ProductsModule } from './products/products.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    ProductsModule
  ]
})
export class AppModule {}