import { Controller, Get } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { RequireModule } from '../../../platform/module-registry';
import { GetWalaweModuleStatusQuery } from '../application/queries/get-walawe-module-status.query';

@ApiTags("wa'lawe")
@ApiCookieAuth()
@Controller('walawe')
@RequireModule('walawe')
export class WalaweController {
  constructor(private readonly status: GetWalaweModuleStatusQuery) {}

  @Get()
  @RequirePermission('tournament:read')
  @ApiOperation({
    summary: "Get wa'lawe module status",
    description:
      "Returns the initial Phase 7 module status for tenants with the wa'lawe module enabled.",
  })
  @ApiOkResponse({ description: "wa'lawe module status" })
  getStatus() {
    return this.status.execute();
  }
}
