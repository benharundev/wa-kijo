import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';
import {
  EnableModuleSchema,
  type EnableModuleDto,
} from '@wa-kijo/shared';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import type { RequestContext } from '../../../common/context/request-context';
import { ModulesAdminService } from './modules-admin.service';

/**
 * `ModulesAdminController` — read the registry, list per-tenant
 * enablement, toggle modules for the active organisation.
 *
 * Per ADR-0008:
 *  - Routes live under `/api/v1/admin/modules` (admin-shape, but
 *    tenant-scoped — they never accept an orgId in the path).
 *  - List + read require `module:list` (owner / admin).
 *  - Toggle requires `module:toggle` (owner only).
 *  - Returns 404 for unknown slugs (non-disclosure principle).
 */
@ApiTags('Platform — Modules')
@ApiCookieAuth()
@Controller('admin/modules')
export class ModulesAdminController {
  constructor(private readonly admin: ModulesAdminService) {}

  @Get()
  @RequirePermission('module:list')
  @ApiOperation({
    summary: 'List installed modules',
    description: 'Registry snapshot — every module compiled into this build, regardless of per-tenant enablement.',
  })
  @ApiOkResponse({ description: 'Module summaries' })
  list() {
    return this.admin.listInstalled();
  }

  @Get('enabled')
  @RequirePermission('module:list')
  @ApiOperation({
    summary: 'List modules enabled for the active organisation',
    description: 'Returns one row per installed module with the active org\'s enabled flag, enabledAt timestamp, enabledBy actor, and current per-tenant config snapshot.',
  })
  @ApiOkResponse({ description: 'Per-tenant module states' })
  async listEnabled(@CurrentUser() ctx: RequestContext) {
    await this.admin.ensureLookupCache();
    return this.admin.listForActiveOrg(ctx);
  }

  @Put(':slug')
  @RequirePermission('module:toggle')
  @ApiOperation({
    summary: 'Enable a module for the active organisation',
    description:
      'Idempotent. Validates that all manifest-declared dependencies are already enabled; otherwise returns 409 with the missing slugs in details.missingDependencies.',
  })
  @ApiOkResponse({ description: 'Resulting per-tenant module state' })
  @ApiNotFoundResponse({ description: 'Module slug is unknown' })
  async enable(
    @CurrentUser() ctx: RequestContext,
    @Param('slug') slug: string,
    @Body(new ZodValidationPipe(EnableModuleSchema)) dto: EnableModuleDto,
  ) {
    await this.admin.ensureLookupCache();
    return this.admin.enable(ctx, slug, dto);
  }

  @Delete(':slug')
  @RequirePermission('module:toggle')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Disable a module for the active organisation',
    description:
      'Idempotent. Refuses with 409 if any other module enabled for this tenant declares this module as a dependency.',
  })
  @ApiNoContentResponse({ description: 'Module disabled' })
  @ApiNotFoundResponse({ description: 'Module slug is unknown' })
  async disable(
    @CurrentUser() ctx: RequestContext,
    @Param('slug') slug: string,
  ): Promise<void> {
    await this.admin.ensureLookupCache();
    await this.admin.disable(ctx, slug);
  }
}
