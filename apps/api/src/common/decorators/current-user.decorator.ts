import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { requestContextStorage, type RequestContext } from '../context/request-context';

/**
 * Injects the current RequestContext into a controller parameter.
 * AuthGuard must have run before this is called.
 *
 * @example
 *   @Get()
 *   findAll(@CurrentUser() ctx: RequestContext) {
 *     return this.service.findAll(ctx);
 *   }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, _ctx: ExecutionContext): RequestContext => {
    const store = requestContextStorage.getStore();
    if (!store) {
      throw new Error(
        'requestContextStorage has no store — AuthGuard must run before @CurrentUser()',
      );
    }
    return store;
  },
);
