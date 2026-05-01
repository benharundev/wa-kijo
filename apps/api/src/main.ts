import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Logger } from 'nestjs-pino';
import type { FastifyInstance } from 'fastify';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { EnvService } from './config/env.service';
import { BETTER_AUTH, type BetterAuthInstance } from './auth/better-auth.token';
import { requestContextStorage } from './common/context/request-context';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }), // Pino handles logging via nestjs-pino
    { bufferLogs: true },
  );

  // Replace NestJS default logger with Pino
  app.useLogger(app.get(Logger));
  app.flushLogs();

  const env = app.get(EnvService);
  const auth = app.get<BetterAuthInstance>(BETTER_AUTH);
  const fastifyInstance = app.getHttpAdapter().getInstance() as FastifyInstance;

  // ── AsyncLocalStorage context ────────────────────────────────────────────────
  // Wrap every incoming request in a storage context. The initial store only
  // has requestId; AuthGuard fills in userId, orgId, userRole, etc. after
  // session validation. Calling done() inside run() propagates the context
  // through the entire async call chain for this request (Node.js async_hooks).
  fastifyInstance.addHook('onRequest', (request, _reply, done) => {
    requestContextStorage.run(
      {
        requestId: request.id as string,
        userId: '',
        orgId: '',
        orgType: 'WORKSPACE',
        userRole: 'member',
        globalRole: 'user',
      },
      done,
    );
  });

  // ── Better Auth handler ──────────────────────────────────────────────────────
  // Mount at /api/auth/* using a second onRequest hook. This fires before body
  // parsing, so the raw stream is available for Better Auth to read.
  // Returning `reply` from a Fastify hook stops the lifecycle — Fastify will
  // not attempt to route/handle the request further.
  //
  // Dynamic import required: better-auth/node is ESM-only and cannot be
  // loaded via require(). We cache toNodeHandler after the first import.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let toNodeHandler: ((auth: any) => (req: any, res: any) => Promise<void>) | null = null;

  fastifyInstance.addHook('onRequest', async (request, reply) => {
    if (request.url?.startsWith('/api/auth/')) {
      if (!toNodeHandler) {
        // ESM interop: use new Function() to prevent SWC from transforming
        // import() to require() in CJS builds.
        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        const mod = await new Function('s', 'return import(s)')('better-auth/node');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        toNodeHandler = mod.toNodeHandler as (auth: any) => (req: any, res: any) => Promise<void>;
      }
      // toNodeHandler is always set after the if-block above
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      await toNodeHandler!(auth)(request.raw, reply.raw);
      return reply; // stop Fastify lifecycle — Better Auth has sent the response
    }
  });

  // ── NestJS middleware ────────────────────────────────────────────────────────
  app.setGlobalPrefix(env.get('API_PREFIX'));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  app.enableCors({
    origin: env.get('CORS_ORIGIN'),
    credentials: true,
  });

  const port = env.get('PORT');
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
