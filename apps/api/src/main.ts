import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { EnvService } from './config/env.service';

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
