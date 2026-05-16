import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Logger } from 'nestjs-pino';
import type { FastifyInstance } from 'fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { patchNestJsSwagger } from 'nestjs-zod';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { FastifyAdapter as BullBoardFastifyAdapter } from '@bull-board/fastify';
import { getQueueToken } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { EnvService } from './config/env.service';
import { BETTER_AUTH, type BetterAuthInstance } from './auth/better-auth.token';
import { requestContextStorage } from './common/context/request-context';
import { FilteredLogger } from './common/logger/filtered-logger';
import { QUEUE_NAMES } from './queues/queue.names';

// Patches Swagger schema generation to understand nestjs-zod DTOs.
// Must be called before SwaggerModule.createDocument().
patchNestJsSwagger();

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }), // Pino handles logging via nestjs-pino
    {
      bufferLogs: true,
      // rawBody: true stores the raw request body buffer on req.rawBody.
      // Required for Stripe webhook signature verification.
      rawBody: true,
    },
  );

  // Replace NestJS default logger with Pino (wrapped to suppress the
  // LegacyRouteConverter noise — see FilteredLogger for the full rationale).
  app.useLogger(new FilteredLogger(app.get(Logger)));
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
  // CORS must be applied here manually. toNodeHandler writes directly to
  // reply.raw (Node's ServerResponse), bypassing Fastify's header layer and
  // app.enableCors(). We set headers on reply.raw before handing off, and
  // handle OPTIONS preflight ourselves so the browser never sees a missing
  // Access-Control-Allow-Origin on auth routes.
  //
  // Dynamic import required: better-auth/node is ESM-only and cannot be
  // loaded via require(). We cache toNodeHandler after the first import.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let toNodeHandler: ((auth: any) => (req: any, res: any) => Promise<void>) | null = null;

  fastifyInstance.addHook('onRequest', async (request, reply) => {
    if (request.url?.startsWith('/api/auth/')) {
      const corsOrigin = env.get('CORS_ORIGIN');
      reply.raw.setHeader('Access-Control-Allow-Origin', corsOrigin);
      reply.raw.setHeader('Access-Control-Allow-Credentials', 'true');
      reply.raw.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      reply.raw.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,Cookie');

      // Respond to preflight immediately — do not forward OPTIONS to Better Auth.
      if (request.method === 'OPTIONS') {
        reply.raw.writeHead(204);
        reply.raw.end();
        return reply;
      }

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

  // ── Swagger (non-production only) ───────────────────────────────────────────
  if (env.get('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("wa'kijo API")
      .setDescription('Multi-tenant B2B SaaS boilerplate — API reference')
      .setVersion('1.0')
      .addCookieAuth('better-auth.session_token') // Better Auth session cookie
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      jsonDocumentUrl: 'api/docs/json',
    });
  }

  // ── Bull Board (non-production only) ────────────────────────────────────────
  // Mounts a real-time queue dashboard at /admin/queues.
  // Protected by HTTP Basic Auth when BULL_BOARD_PASSWORD is set.
  // In production, set BULL_BOARD_PASSWORD or place /admin/* behind a VPN/IP
  // allowlist at the load-balancer level.
  if (env.get('NODE_ENV') !== 'production') {
    const messageQueue = app.get<Queue>(getQueueToken(QUEUE_NAMES.MESSAGE_DISPATCH));
    const serverAdapter = new BullBoardFastifyAdapter();

    createBullBoard({
      queues: [new BullMQAdapter(messageQueue)],
      serverAdapter,
    });

    serverAdapter.setBasePath('/admin/queues');

    const bullBoardUser = env.get('BULL_BOARD_USERNAME');
    const bullBoardPass = env.get('BULL_BOARD_PASSWORD');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const registerOpts: Record<string, any> = { prefix: '/admin/queues', logLevel: 'warn' };

    if (bullBoardPass) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      registerOpts['preHandler'] = async (request: any, reply: any) => {
        const auth = (request.headers['authorization'] as string | undefined) ?? '';
        const [type, encoded] = auth.split(' ');
        if (type !== 'Basic' || !encoded) {
          void reply.code(401).header('WWW-Authenticate', 'Basic realm="Bull Board"').send('Unauthorized');
          return;
        }
        const decoded = Buffer.from(encoded, 'base64').toString('utf8');
        const [user, pass] = decoded.split(':');
        if (user !== bullBoardUser || pass !== bullBoardPass) {
          void reply.code(401).header('WWW-Authenticate', 'Basic realm="Bull Board"').send('Unauthorized');
        }
      };
    }

    await fastifyInstance.register(serverAdapter.registerPlugin(), registerOpts);
  }

  const port = env.get('PORT');
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
