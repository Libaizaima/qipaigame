import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * 自定义装饰器：从请求中提取当前用户信息
 * 用法: @CurrentUser() user: JwtPayload
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    if (data) {
      return request.user?.[data];
    }
    return request.user;
  },
);
