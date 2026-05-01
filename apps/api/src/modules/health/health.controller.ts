import { Controller, Get, HttpStatus } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { Res } from '@nestjs/common';
import { HealthService } from './health.service';
import { Public } from '../../common/decorators/public.decorator';

// @Res() is used intentionally here to bypass TransformInterceptor.
// Health checks have a well-defined response shape that monitoring systems
// rely on — wrapping it in { success, data, timestamp } would break them.
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  async check(@Res() reply: FastifyReply): Promise<void> {
    const result = await this.healthService.check();
    const statusCode = result.status === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    reply.status(statusCode).send(result);
  }
}
