import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import type { RequestContext } from '../../../common/context/request-context';
import { CreateExampleUseCase } from '../application/commands/create-example.usecase';
import { GetExampleQuery } from '../application/queries/get-example.query';

/**
 * HTTP boundary. Translates between HTTP and use cases. Holds NO
 * business logic. Always validates input via `ZodValidationPipe`
 * (omitted in this template for brevity but mandatory per
 * `.claude/rules/backend.md`).
 */
@ApiTags('Examples')
@ApiCookieAuth()
@Controller('examples')
export class ExampleController {
  constructor(
    private readonly create: CreateExampleUseCase,
    private readonly read: GetExampleQuery,
  ) {}

  @Post()
  @RequirePermission('example:create')
  @ApiOperation({ summary: 'Create example' })
  @ApiCreatedResponse({ description: 'Example created' })
  async createOne(@CurrentUser() ctx: RequestContext, @Body() body: { id: string; title: string }) {
    const example = await this.create.execute(ctx, body);
    return { id: example.id, title: example.title, status: example.status.value };
  }

  @Get(':id')
  @RequirePermission('example:read')
  @ApiOperation({ summary: 'Get example by ID' })
  @ApiOkResponse({ description: 'Example' })
  @ApiNotFoundResponse({ description: 'Example not found' })
  async findOne(@CurrentUser() ctx: RequestContext, @Param('id') id: string) {
    const example = await this.read.execute(ctx, id);
    return { id: example.id, title: example.title, status: example.status.value };
  }
}
