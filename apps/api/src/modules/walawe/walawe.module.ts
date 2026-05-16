import { Module } from '@nestjs/common';
import { GetWalaweModuleStatusQuery } from './application/queries/get-walawe-module-status.query';
import { WalaweController } from './presentation/walawe.controller';

@Module({
  controllers: [WalaweController],
  providers: [GetWalaweModuleStatusQuery],
  exports: [GetWalaweModuleStatusQuery],
})
export class WalaweModule {}
