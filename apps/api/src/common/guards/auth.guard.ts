import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { requestContextStorage } from '../context/request-context';
import { AuthService } from '../../auth/auth.service';

/**
 * Global guard: validates the session cookie and populates the RequestContext.
 *
 * Applied as APP_GUARD so it runs on every route. Routes decorated with
 * @Public() skip session validation (RequestContext is still available but
 * only has requestId populated — AuthService fills nothing else).
 *
 * Order: AuthGuard → PermissionGuard.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const requestId = request.id as string;

    const ctx = await this.authService.resolveContext(request.headers, requestId);

    if (!ctx) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    // Write resolved context into the AsyncLocalStorage store that was
    // initialised by the onRequest hook in main.ts. The store is already
    // running — we mutate it in-place so all downstream code sees the full ctx.
    const store = requestContextStorage.getStore();
    if (store) {
      Object.assign(store, ctx);
    }

    return true;
  }
}
