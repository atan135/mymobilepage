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
import { AdminExportsModule } from './admin-exports/admin-exports.module'
import { AdminCouponsModule } from './admin-coupons/admin-coupons.module'
import { AdminRefundsModule } from './admin-refunds/admin-refunds.module'
import { AdminReviewsModule } from './admin-reviews/admin-reviews.module'
import { AdminInventoryModule } from './admin-inventory/admin-inventory.module'
import { InventoryModule } from './inventory/inventory.module'
import { AuditModule } from './audit/audit.module'
import { AdminAuditLogsModule } from './admin-audit-logs/admin-audit-logs.module'
import { AdminSettingsModule } from './admin-settings/admin-settings.module'
import { ClientSettingsModule } from './client-settings/client-settings.module'
import { ClientBannersModule } from './client-banners/client-banners.module'
import { ClientOrdersModule } from './client-orders/client-orders.module'
import { CouponsModule } from './coupons/coupons.module'
import { RefundsModule } from './refunds/refunds.module'

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
    AdminExportsModule,
    AdminCouponsModule,
    AdminRefundsModule,
    AdminReviewsModule,
    AdminInventoryModule,
    InventoryModule,
    AuditModule,
    AdminAuditLogsModule,
    AdminSettingsModule,
    ClientBannersModule,
    ClientSettingsModule,
    ClientOrdersModule,
    CouponsModule,
    RefundsModule
  ]
})
export class AppModule {}

