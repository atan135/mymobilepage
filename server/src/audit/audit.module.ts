import { Global, Module } from '@nestjs/common'
import { APP_INTERCEPTOR } from '@nestjs/core'
import { AuditInterceptor } from './audit.interceptor'
import { AuditService } from './audit.service'

@Global()
@Module({
  providers: [
    AuditService,
    AuditInterceptor,
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor }
  ],
  exports: [AuditService, AuditInterceptor]
})
export class AuditModule {}
