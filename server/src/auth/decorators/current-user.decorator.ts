import { createParamDecorator, type ExecutionContext } from '@nestjs/common'
import type { Request } from 'express'

/**
 * 用法：@CurrentUser() user => req.user
 * JwtAuthGuard 校验后会写入 req.user = { sub, username }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<Request>()
    return (req as Request & { user?: unknown }).user
  }
)
