import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import { CategoriesModule } from './categories/categories.module'
import { ProductsModule } from './products/products.module'
import { AdminAuthModule } from './admin-auth/admin-auth.module'
import { AdminUsersModule } from './admin-users/admin-users.module'
import { AdminCategoriesModule } from './admin-categories/admin-categories.module'
import { AdminProductsModule } from './admin-products/admin-products.module'
import { AdminBannersModule } from './admin-banners/admin-banners.module'
import { AdminAnnouncementsModule } from './admin-announcements/admin-announcements.module'
import { AdminOrdersModule } from './admin-orders/admin-orders.module'
import { AdminDashboardModule } from './admin-dashboard/admin-dashboard.module'
import { ClientBannersModule } from './client-banners/client-banners.module'
import { ClientOrdersModule } from './client-orders/client-orders.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    PrismaModule,
    AuthModule,
    AdminAuthModule,
    UsersModule,
    CategoriesModule,
    ProductsModule,
    AdminUsersModule,
    AdminCategoriesModule,
    AdminProductsModule,
    AdminBannersModule,
    AdminAnnouncementsModule,
    AdminOrdersModule,
    AdminDashboardModule,
    ClientBannersModule,
    ClientOrdersModule
  ]
})
export class AppModule {}
