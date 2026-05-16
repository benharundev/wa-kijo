import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@wa-kijo/db';
import type { FastifyReply, FastifyRequest } from 'fastify';

const PRISMA_ERROR_STATUS: Record<string, number> = {
  P2002: HttpStatus.CONFLICT, // unique constraint violation
  P2025: HttpStatus.NOT_FOUND, // record not found
  P2003: HttpStatus.BAD_REQUEST, // foreign key constraint violation
  P2034: HttpStatus.CONFLICT, // transaction conflict
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'INTERNAL_SERVER_ERROR';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'string' ? res : ((res as { message?: string }).message ?? message);
      error = exception.constructor.name.replace('Exception', '').toUpperCase();
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      statusCode = PRISMA_ERROR_STATUS[exception.code] ?? HttpStatus.INTERNAL_SERVER_ERROR;
      message = `Database error: ${exception.code}`;
      error = 'DATABASE_ERROR';
      this.logger.error(
        { code: exception.code, meta: exception.meta },
        'Prisma known request error',
      );
    } else if (exception instanceof Error) {
      this.logger.error({ err: exception }, 'Unhandled exception');
    }

    reply.status(statusCode).send({
      success: false,
      statusCode,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
